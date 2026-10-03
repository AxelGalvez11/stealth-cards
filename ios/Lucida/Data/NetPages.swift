// A shared deck's pages (PhonePublicDeck, PhoneSuggestions, PhoneHistory and their variants): what the server answers for a
// deck's page, its History, and the suggestions waiting on it (web/social.mjs deckPage, historyPage, suggestionsFor), what
// each tap does (web/db.js study, copyDeck, star, watch, suggest, decide, restore), and the words the pages use for cards,
// changes, and versions (design/build.mjs NETX_JS), so the iPhone says exactly what the web app does.
import Foundation

// ---------- addresses ----------
/// A shared deck's page: by its owner's handle and its name in a link (/@maria/mcat-biochemistry), or by its lasting id
/// (/d/<id>). `copy` opens Make a copy with the page (?copy=1); `suggest` opens Suggest a change (?suggest=<card>: a card's
/// id, "new" for a new card, or "1" for none picked yet), like the web's links.
struct DeckAddress: Hashable {
  var handle = "", slug = "", id = ""
  var copy = false, suggest = ""
  init(handle: String = "", slug: String = "", id: String = "", copy: Bool = false, suggest: String = "") {
    self.handle = handle.lowercased(); self.slug = slug.lowercased(); self.id = id; self.copy = copy; self.suggest = suggest
  }
  /// A deck's address from the path the server gives (web/app.js network()): /@handle/slug or /d/<id>, and the page's
  /// ?copy=1 and ?suggest=<card> if it has them.
  init?(path: String) {
    let parts = path.split(separator: "?", maxSplits: 1, omittingEmptySubsequences: false).map(String.init)
    let p = parts[0]
    if let m = DeckAddress.match("^/@([A-Za-z0-9_.]{3,30})/([A-Za-z0-9-]{1,60})/?$", p) { self.init(handle: m[1], slug: m[2]) }
    else if let m = DeckAddress.match("^/d/(s[a-z0-9]{4,40})/?$", p) { self.init(id: m[1]) }
    else { return nil }
    for kv in (parts.count > 1 ? parts[1] : "").split(separator: "&") {
      let x = kv.split(separator: "=", maxSplits: 1, omittingEmptySubsequences: false).map(String.init)
      let v = x.count > 1 ? x[1].removingPercentEncoding ?? x[1] : ""
      if x[0] == "copy" { copy = v == "1" } else if x[0] == "suggest" { suggest = v }
    }
  }
  private static func match(_ pattern: String, _ s: String) -> [String]? {
    guard let re = try? NSRegularExpression(pattern: pattern), let m = re.firstMatch(in: s, range: NSRange(s.startIndex..., in: s)) else { return nil }
    return (0..<m.numberOfRanges).map { m.range(at: $0).location == NSNotFound ? "" : String(s[Range(m.range(at: $0), in: s)!]) }
  }
  /// What names this page (its answer is kept under it).
  var key: String { id.isEmpty ? handle + "/" + slug : id }
  var path: String { id.isEmpty ? "/@" + handle + "/" + slug : "/d/" + id }
  /// The same page, without the ?copy and ?suggest a link opened it with.
  var plain: DeckAddress { DeckAddress(handle: handle, slug: slug, id: id) }
}

// ---------- what the server answers ----------
/// A card as a shared deck's page and its changes show it (web/social.mjs CONTENT and a page's cardsList): what it says,
/// how it was made (its trail), and where it came from.
struct SharedCard: Decodable {
  struct Step: Decodable {
    var w = "", by = "", ai = ""
    enum CodingKeys: String, CodingKey { case w, by, ai }
    init(from d: Decoder) throws { let c = try d.container(keyedBy: CodingKeys.self); w = c.v(.w, ""); by = c.v(.by, ""); ai = c.v(.ai, "") }
  }
  var id = "", kind = "basic", front = "", back = "", text = "", note = "", speak = "", lang = "", source = ""
  var tags: [String] = []
  var image: String? = nil, audio: String? = nil, wave: Wave? = nil, auto = true
  /// A picture's boxes and what to hide (a box's own card has its box), its blank (one card per blank, -1 for all), and the cards
  /// made with it (one per blank or box): what the card editor needs to open it as it is (Suggest a change).
  var box: String? = nil, occ = "one", cloze: Int? = nil, group: String? = nil
  var boxes: [OccBox] = []
  var trail: [Step] = []
  enum CodingKeys: String, CodingKey { case id, kind, front, back, text, note, speak, lang, source, tags, image, audio, wave, auto, box, occ, cloze, group, boxes, trail }
  init() {}
  init(from d: Decoder) throws {
    let c = try d.container(keyedBy: CodingKeys.self)
    id = c.v(.id, ""); kind = c.v(.kind, "basic"); front = c.v(.front, ""); back = c.v(.back, ""); text = c.v(.text, ""); note = c.v(.note, ""); speak = c.v(.speak, ""); lang = c.v(.lang, "")
    source = c.v(.source, ""); tags = c.v(.tags, []); image = c.v(.image, nil); audio = c.v(.audio, nil); wave = c.v(.wave, nil); auto = c.v(.auto, true)
    box = c.v(.box, nil); occ = c.v(.occ, "one") == "all" ? "all" : "one"; cloze = c.v(.cloze, nil); group = c.v(.group, nil); boxes = c.v(.boxes, []); trail = c.v(.trail, [])
  }
}

/// One change to a card (a suggestion's, or one a version made): add, edit, or remove, what kind of change it is (web/social.mjs
/// kindOf), what the card said before and after, and (a suggestion's) what became of it: open, taken, skipped, or gone.
struct ChangeRow: Decodable {
  var id = "", card = "", op = "edit", kind = "", status = "open"
  var before: SharedCard? = nil, after: SharedCard? = nil
  enum CodingKeys: String, CodingKey { case id, card, op, kind, status, before, after }
  init(from d: Decoder) throws {
    let c = try d.container(keyedBy: CodingKeys.self)
    id = c.v(.id, ""); card = c.v(.card, ""); op = c.v(.op, "edit"); kind = c.v(.kind, ""); status = c.v(.status, "open"); before = c.v(.before, nil); after = c.v(.after, nil)
  }
}

/// A version of a shared deck (a deck page's `made`, History's versions): who made it (a person, or the AI app that
/// worked for them), what it says, when, and (History's) the changes in it.
struct VersionRow: Decodable {
  var version = 0, kind = "", summary = "", ai = "", at = "", n = 0
  var by: NetPerson? = nil
  var changes: [ChangeRow]? = nil
  enum CodingKeys: String, CodingKey { case version, kind, summary, ai, at, by, n, changes }
  init(from d: Decoder) throws {
    let c = try d.container(keyedBy: CodingKeys.self)
    version = c.v(.version, 0); kind = c.v(.kind, ""); summary = c.v(.summary, ""); ai = c.v(.ai, ""); at = c.v(.at, ""); n = c.v(.n, 0); by = c.v(.by, nil); changes = c.v(.changes, nil)
  }
}

/// A shared deck's page (social.mjs deckPage): the deck as a tile has it, plus its helpers, everyone whose changes are in
/// it, its cards (the first 500, with `moreCards` for the rest), how it was made, and what you have to do with it.
struct PublicDeckPage: Decodable {
  struct Mini: Decodable {
    var handle = "", name = "", n = 0
    enum CodingKeys: String, CodingKey { case handle, name, n }
    init(handle: String, name: String, n: Int = 0) { self.handle = handle; self.name = name; self.n = n }
    init(from d: Decoder) throws { let c = try d.container(keyedBy: CodingKeys.self); handle = c.v(.handle, ""); name = c.v(.name, ""); n = c.v(.n, 0) }
  }
  /// What you have to do with it: yours (`owner`), studying it as it is (`studying`: your deck's id), your copy of it
  /// (`copied`), saved, getting its updates, and how many suggestions wait (on your own).
  struct Me: Decodable {
    var owner = false, helper = false, studying = "", copied = "", watching = false, starred = false, open = 0
    enum CodingKeys: String, CodingKey { case owner, helper, studying, copied, watching, starred, open }
    init(owner: Bool = false, helper: Bool = false, studying: String = "", copied: String = "", watching: Bool = false, starred: Bool = false, open: Int = 0) {
      self.owner = owner; self.helper = helper; self.studying = studying; self.copied = copied; self.watching = watching; self.starred = starred; self.open = open
    }
    init(from d: Decoder) throws {
      let c = try d.container(keyedBy: CodingKeys.self)
      owner = c.v(.owner, false); helper = c.v(.helper, false); studying = c.v(.studying, ""); copied = c.v(.copied, ""); watching = c.v(.watching, false); starred = c.v(.starred, false); open = c.v(.open, 0)
    }
  }
  var deck: NetDeck
  var helpers: [Mini] = [], contributors: [Mini] = []
  var people: [NetPerson] = []
  var cardsList: [SharedCard] = []
  var moreCards = 0
  var made: [VersionRow] = []
  var me: Me? = nil
  /// Its Guide for anyone: the pages with words, and how many sources it was made from (a number only). nil: it has neither.
  var guide: PublicGuide? = nil
  var id: String { deck.id }
  enum CodingKeys: String, CodingKey { case helpers, contributors, people, cardsList, moreCards, made, me, guide }
  init(deck: NetDeck, helpers: [Mini], contributors: [Mini], people: [NetPerson], cardsList: [SharedCard], moreCards: Int, made: [VersionRow], me: Me?, guide: PublicGuide? = nil) {
    self.deck = deck; self.helpers = helpers; self.contributors = contributors; self.people = people; self.cardsList = cardsList; self.moreCards = moreCards; self.made = made; self.me = me; self.guide = guide
  }
  init(from d: Decoder) throws {
    deck = try NetDeck(from: d)
    let c = try d.container(keyedBy: CodingKeys.self)
    helpers = c.v(.helpers, []); contributors = c.v(.contributors, []); people = c.v(.people, []); cardsList = c.v(.cardsList, []); moreCards = c.v(.moreCards, 0); made = c.v(.made, []); me = c.v(.me, nil)
    guide = c.v(.guide, nil)
  }
}

/// A deck's History (social.mjs historyPage): every version, newest first. `mine`: it's your deck, so you can go back.
struct HistoryPage: Decodable {
  var id = "", name = "", url = ""
  var owner: NetPerson? = nil
  var mine = false, following = 0
  var versions: [VersionRow] = []
  enum CodingKeys: String, CodingKey { case id, name, url, owner, mine, following, versions }
  init(id: String, name: String, url: String, owner: NetPerson?, mine: Bool, following: Int, versions: [VersionRow]) {
    self.id = id; self.name = name; self.url = url; self.owner = owner; self.mine = mine; self.following = following; self.versions = versions
  }
  init(from d: Decoder) throws {
    let c = try d.container(keyedBy: CodingKeys.self)
    id = c.v(.id, ""); name = c.v(.name, ""); url = c.v(.url, ""); owner = c.v(.owner, nil); mine = c.v(.mine, false); following = c.v(.following, 0); versions = c.v(.versions, [])
  }
}

/// Changes someone suggested to a deck of yours (social.mjs suggestionsFor): who sent it (a person, or the AI app that
/// worked for them), what they said, and each change to take or skip.
struct SuggestionRow: Decodable, Identifiable {
  var id = "", sharedId = "", authorName = "", ai = "", message = "", status = "open", createdAt = ""
  var person: NetPerson? = nil
  var deck: NetDeckRef? = nil
  var changes: [ChangeRow] = []
  enum CodingKeys: String, CodingKey { case id, sharedId = "shared_id", authorName = "author_name", ai, message, status, createdAt = "created_at", person, deck, changes }
  init(from d: Decoder) throws {
    let c = try d.container(keyedBy: CodingKeys.self)
    id = c.v(.id, ""); sharedId = c.v(.sharedId, ""); authorName = c.v(.authorName, ""); ai = c.v(.ai, ""); message = c.v(.message, ""); status = c.v(.status, "open")
    createdAt = c.v(.createdAt, ""); person = c.v(.person, nil); deck = c.v(.deck, nil); changes = c.v(.changes, [])
  }
}

// ---------- the design screens' sample (design/net-sample.mjs, the parts these pages use) ----------
struct PagesSample: Decodable {
  let CARDS: [SharedCard]
  let MADE: [VersionRow]
  let CELL_HISTORY: [VersionRow]
  let SUGGESTIONS: [SuggestionRow]
  static let shared: PagesSample = try! JSONDecoder().decode(PagesSample.self, from: Data(Generated.netSampleJSON.utf8))
}

/// What these design screens start with (the boards' own settings, mock.mjs `p`) and what a tap changed on them (mock.mjs
/// `m`): kept in the store's `demoNet.pages`.
struct DemoPages {
  /// The deck page as its owner sees it, studied as it is, and getting its updates.
  var owner = false, studying = false, watching = false
  /// Suggestions with one opened ("g1"), the AI's cards waiting (the canvas default) or not, and none at all.
  var pickItem = "", aiWaiting = true, noSuggestions = false
  /// History with a version opened.
  var openVersion: Int? = nil
  // Changed on the screen: copied (Make a copy), a save, a teacher's check (Check this deck), who decided what, going back,
  // the AI's cards kept or tossed.
  var copied = false, starred = false, checked = false
  var picks: [String: [String: String]] = [:]
  var restored: Int? = nil
  var aiDone: [String: String] = [:]
}

// ---------- the words pages use (NETX_JS) ----------
enum PageText {
  static func collapse(_ s: String) -> String { s.replacingOccurrences(of: "\\s+", with: " ", options: .regularExpression).trimmingCharacters(in: .whitespacesAndNewlines) }
  /// Words without formatting, on one line (a formula as it looks).
  static func flat(_ s: String?) -> String { collapse(Rich.plain(s ?? "", join: " ", showMath: true)) }
  static func firstName(_ name: String) -> String {
    let n = name.trimmingCharacters(in: .whitespacesAndNewlines)
    if n.range(of: "^(dr|prof|mr|mrs|ms)\\.?\\s", options: [.regularExpression, .caseInsensitive]) != nil { return n }
    return n.split(whereSeparator: \.isWhitespace).first.map(String.init) ?? n
  }
  /// 3 cards, 1 person, 2 people.
  static func plural(_ n: Int, _ w: String, _ ws: String? = nil) -> String { "\(n) " + (n == 1 ? w : ws ?? w + "s") }
  static let kinds = ["basic": "Basic", "cloze": "Fill in the blank", "image": "Image", "audio": "Audio"]

  // ----- time: the canvas counts from its sample's own morning -----
  static func now(_ demo: Bool) -> Date { demo ? NetFmt.date("2026-09-28T10:00:00Z") ?? Date() : Date() }
  static func since(_ iso: String, _ demo: Bool) -> Int? {
    guard let d = NetFmt.date(iso) else { return nil }
    return max(0, Int((now(demo).timeIntervalSince(d) / 60).rounded(.toNearestOrAwayFromZero)))
  }
  static func day(_ iso: String) -> String {
    guard let d = NetFmt.date(iso) else { return "" }
    let cal = Calendar.current
    return NetFmt.months3[cal.component(.month, from: d) - 1] + " \(cal.component(.day, from: d))"
  }
  private static func round(_ x: Double) -> Int { Int(x.rounded(.toNearestOrAwayFromZero)) }
  /// Just now, 5 min ago, 3h ago, Yesterday, 4 days ago, 1 week ago, 3 weeks ago, or the day.
  static func rel(_ iso: String, _ demo: Bool) -> String {
    guard let m = since(iso, demo) else { return "" }
    if m < 1 { return "Just now" }
    if m < 60 { return "\(m) min ago" }
    let h = round(Double(m) / 60)
    if h < 24 { return "\(h)h ago" }
    let dd = round(Double(h) / 24)
    return dd == 1 ? "Yesterday" : dd < 7 ? "\(dd) days ago" : dd < 14 ? "1 week ago" : dd < 28 ? "\(round(Double(dd) / 7)) weeks ago" : day(iso)
  }
  /// 5m, 3h, Yesterday, 4d, or the day.
  static func brief(_ iso: String, _ demo: Bool) -> String {
    guard let m = since(iso, demo) else { return "" }
    if m < 60 { return "\(max(1, m))m" }
    let h = round(Double(m) / 60)
    if h < 24 { return "\(h)h" }
    let dd = round(Double(h) / 24)
    return dd == 1 ? "Yesterday" : dd < 7 ? "\(dd)d" : day(iso)
  }

  // ----- a card's words -----
  static func boxLabel(_ c: SharedCard) -> String { c.boxes.first { $0.id == c.box }?.label.trimmingCharacters(in: .whitespacesAndNewlines) ?? "" }
  /// A card's question: a blank shows as ____.
  static func askOf(_ c: SharedCard?) -> String {
    guard let c else { return "" }
    if c.kind == "cloze" { return collapse(Rich.plain(c.text, cloze: true, blank: "____", join: " ", showMath: true)) }
    let f = flat(c.front)
    if !f.isEmpty { return f }
    return c.box != nil ? "What’s under the box?" : c.kind == "image" ? "Picture" : c.kind == "audio" ? (flat(c.speak).nilIfEmpty ?? "Sound") : ""
  }
  static func answerOf(_ c: SharedCard?) -> String {
    guard let c else { return "" }
    return c.kind == "cloze" ? Rich.blanks(c.text, showMath: true).joined(separator: ", ") : c.box != nil ? boxLabel(c) : flat(c.back)
  }
  /// A card in a change: its words with the answer after ("Q: … A: …"), a blank in [brackets].
  static func wordsOf(_ c: SharedCard?) -> String {
    guard let c else { return "" }
    if c.kind == "cloze" { return flat(c.text).replacingOccurrences(of: "\\[\\[([^\\]]*)\\]\\]", with: "[$1]", options: .regularExpression) }
    let a = askOf(c), b = answerOf(c)
    // (The board writes two spaces; a page shows them as one.)
    return b.isEmpty ? a : "Q: " + a + " A: " + b
  }
  /// How a card was made and last touched, and by whom (a person, or their AI app).
  static func touch(_ c: SharedCard, owner: String) -> (note: String, ai: String, name: String) {
    let ed = c.trail.last { $0.w == "edited" }, mk = c.trail.first { $0.w == "made" || $0.w == "imported" }
    let src = !c.source.isEmpty && !["you", "import", "shared", "suggestion"].contains(c.source) ? c.source : ""
    if let ed { let nm = ed.by.nilIfEmpty ?? (ed.ai.isEmpty ? owner : ""); return ("Edited by " + (ed.ai.nilIfEmpty ?? firstName(nm)), ed.ai, nm) }
    if let mk, !(mk.ai.isEmpty && mk.by.isEmpty) { return ("Added by " + (mk.ai.nilIfEmpty ?? firstName(mk.by)), mk.ai, mk.by) }
    if !src.isEmpty { return ("Added by " + src, src, "") }
    return ("", "", owner)
  }

  // ----- who -----
  static func isClaude(_ n: String) -> Bool { n.range(of: "claude", options: .caseInsensitive) != nil }
  static let changeLabels = ["new": "New card", "answer": "Answer", "question": "Question", "typo": "Typo", "media": "Picture or sound", "edit": "Note or tags", "remove": "Remove"]
  private static let words: [(String, String, String)] = [("new", "new card", "new cards"), ("answer", "answer fixed", "answers fixed"), ("question", "question reworded", "questions reworded"),
    ("typo", "small fix", "small fixes"), ("media", "new picture or sound", "new pictures or sounds"), ("edit", "note or tag changed", "notes or tags changed"), ("remove", "card removed", "cards removed")]
  /// What a list of changes did: "1 new card, 1 answer fixed".
  static func sumOf(_ list: [ChangeRow]) -> String {
    let s = words.compactMap { k, one, many -> String? in let n = list.filter { $0.kind == k }.count; return n == 0 ? nil : "\(n) " + (n == 1 ? one : many) }.joined(separator: ", ")
    return s.prefix(1).uppercased() + s.dropFirst()
  }

  /// What one change does to a card: its kind, the card it's on, and the words before and after.
  struct Change { var label = "", context = "", before = "", after = "" }
  static func changeView(_ ch: ChangeRow) -> Change {
    let b = ch.before, a = ch.after
    let k = ch.kind.nilIfEmpty ?? (ch.op == "add" ? "new" : ch.op == "remove" ? "remove" : "edit")
    var before = "", after = "", context = ""
    if k == "new" { after = wordsOf(a) }
    else if k == "remove" { before = wordsOf(b) }
    else if let b, let a, b.kind != a.kind { before = wordsOf(b); after = wordsOf(a) }
    else if k == "answer" { context = askOf(a); before = answerOf(b); after = answerOf(a) }
    else if k == "question" { before = askOf(b); after = askOf(a) }
    else if k == "typo" {
      let q0 = askOf(b), q1 = askOf(a)
      if q0 != q1 { before = q0; after = q1 } else { context = q1; before = answerOf(b); after = answerOf(a) }
    }
    else if k == "media" { context = askOf(a); after = (a?.image?.isEmpty == false || a?.audio?.isEmpty == false) ? "New picture or sound" : "Picture or sound taken out" }
    else { context = askOf(a); before = flat(b?.note).nilIfEmpty ?? (b?.tags ?? []).joined(separator: ", "); after = flat(a?.note).nilIfEmpty ?? (a?.tags ?? []).joined(separator: ", ") }
    return Change(label: changeLabels[k] ?? "Change", context: context, before: before, after: after)
  }

  /// A version as History titles it ("Took 3 changes from Maria Santos") and as a deck's story tells it ("Maria Santos
  /// made it with ChatGPT"), with who made it.
  struct Version {
    var who: Who, withAI = false, ai = "", label = "", version = 0
    var title = "", sub = "", whoName = "", what = "", when = ""
    var handle: String? = nil
  }
  static func versionView(_ v: VersionRow, _ demo: Bool) -> Version {
    let by = v.by ?? NetPerson(name: "Someone"), name = by.name.nilIfEmpty ?? "Someone", ai = v.ai, list = v.changes, n = list?.count ?? v.n
    let allNew = list.map { !$0.isEmpty && $0.allSatisfy { $0.op == "add" } } ?? (v.summary.range(of: "^\\d+ new cards?$", options: .regularExpression) != nil)
    var title = v.summary, sub = list.map(sumOf) ?? "", who = name, what = ""
    switch v.kind {
    case "made": title = name + " made it" + (ai.isEmpty ? "" : " with " + ai); what = "made it" + (ai.isEmpty ? "" : " with " + ai); sub = v.summary
    case "ai":
      who = ai.nilIfEmpty ?? "An AI app"
      what = (allNew ? "added " : "changed ") + plural(n, "card") + " for " + firstName(name)
      title = who + " " + (allNew ? "added " : "changed ") + plural(n, "card"); sub = "Through " + firstName(name) + "’s AI link"
    case "suggestion": title = v.summary.nilIfEmpty ?? "Took " + plural(n, "change") + " from " + name; what = "suggested " + plural(n, "change")
    case "check": title = name + " checked every card"; what = "checked every card"; sub = "Marked as checked"
    case "restore": title = v.summary.nilIfEmpty ?? "Went back"; what = title.prefix(1).lowercased() + title.dropFirst()
    default: title = name + " changed " + plural(n, "card"); what = "changed " + plural(n, "card"); if sub.isEmpty { sub = v.summary }
    }
    return Version(who: v.kind == "ai" ? .ai(ai.nilIfEmpty ?? "AI") : .person(by), withAI: v.kind == "made" && !ai.isEmpty, ai: ai, label: "v\(v.version)", version: v.version,
                   title: title, sub: sub, whoName: who, what: what, when: rel(v.at, demo), handle: v.kind != "ai" && !by.handle.isEmpty ? by.handle : nil)
  }
}

/// A round picture: a person's, or an AI app's spark (Claude's in its orange).
enum Who { case ai(String), person(NetPerson) }

// ---------- answers ----------
extension Store {
  private func pageEnc(_ s: String) -> String { s.addingPercentEncoding(withAllowedCharacters: .alphanumerics) ?? s }

  /// A shared deck's page (nil the first time, before its answer has come).
  func netDeckPage(_ a: DeckAddress) -> NetAnswer<PublicDeckPage>? {
    if demo { return demoDeckPage() }
    return netGet(a.id.isEmpty ? "api/public/deck?h=" + pageEnc(a.handle) + "&s=" + pageEnc(a.slug) : "api/public/deck?id=" + pageEnc(a.id), PublicDeckPage.self)
  }
  /// A shared deck's History, by its shared id.
  func netHistory(_ sharedId: String) -> NetAnswer<HistoryPage>? {
    if demo { return demoHistory() }
    return netGet("api/public/history?id=" + pageEnc(sharedId), HistoryPage.self)
  }
  /// The suggestions waiting on one of your shared decks, and (`netInbox`) on every deck of yours.
  func netSuggestions(_ sharedId: String) -> NetAnswer<[SuggestionRow]>? {
    if demo { return demoSuggestions() }
    return netGet("api/social/suggestions?id=" + pageEnc(sharedId), [SuggestionRow].self)
  }
  func netInbox() -> NetAnswer<[SuggestionRow]>? {
    if demo { return demoSuggestions() }
    return netGet("api/social/suggestions", [SuggestionRow].self)
  }

  /// Whether this page's address is one of your shared decks (its History then belongs to your Library).
  func ownsAddress(_ a: DeckAddress) -> Bool {
    if demo { return true }
    if !a.id.isEmpty { return lib.decks.contains { $0.share?.id == a.id } }
    return !myHandle.isEmpty && a.handle == myHandle
  }
  /// The deck of yours that's shared as this one (Edit, Suggestions, and Share settings open it).
  func libraryDeck(sharedId: String) -> Deck? { lib.decks.first { $0.share?.id == sharedId && $0.share?.vis != "private" } }

  // ---------- what the taps do ----------
  /// Study: the deck joins your library as it is. Its id in your library comes back.
  func studyDeck(_ sharedId: String) async throws -> String {
    if demo { demoNet.pages.studying = true; return "cell" }
    return try await social("deck.study", ["id": sharedId])["deckId"] as? String ?? ""
  }
  /// Make a copy: your own deck to change (in a folder, getting the owner's later changes or not). Its id comes back.
  func copyDeck(_ sharedId: String, name: String, folder: String?, updates: Bool) async throws -> String {
    if demo { demoNet.pages.copied = true; return "cell" }
    return try await social("deck.copy", ["id": sharedId, "name": name, "folder": folder ?? NSNull(), "updates": updates])["deckId"] as? String ?? ""
  }
  func starDeck(_ sharedId: String, _ on: Bool) async throws {
    if demo { demoNet.pages.starred = on; return }
    try await social("deck.star", ["id": sharedId, "on": on])
  }
  func watchDeck(_ sharedId: String, _ on: Bool) async throws {
    if demo { demoNet.pages.watching = on; return }
    try await social("deck.watch", ["id": sharedId, "on": on])
  }
  /// Send changes to the owner (or, from a helper, straight into the deck: `taken`).
  func sendSuggestion(_ sharedId: String, _ changes: [[String: Any]], message: String) async throws -> Bool {
    if demo { return false }
    return try await social("suggestion.send", ["id": sharedId, "changes": changes, "message": message])["taken"] as? Bool ?? false
  }
  /// Take or skip changes of one suggestion (`picks`: change id → "take" or "skip", or `$all`).
  func decideSuggestion(_ id: String, _ picks: [String: String]) async throws {
    if demo {
      var p = demoNet.pages.picks[id] ?? [:]
      for (k, v) in picks { p[k] = v }
      demoNet.pages.picks[id] = p
      return
    }
    try await social("suggestion.decide", ["id": id, "picks": picks])
  }
  /// Go back to a version of your deck (as a new version).
  func restoreVersion(_ sharedId: String, _ version: Int) async throws {
    if demo { demoNet.pages.restored = version; return }
    try await social("version.restore", ["id": sharedId, "version": version])
  }
  /// Keep or toss cards your AI made that waited for you.
  func keepCards(_ ids: [String], keep: Bool) async throws {
    if demo { for id in ids { demoNet.pages.aiDone[id] = keep ? "kept" : "tossed" }; return }
    let r = await sent(keep ? "card.keep" : "card.delete", ["ids": ids])
    if r == nil { throw APIError.server(error ?? "Something went wrong. Try again.") }
  }

  // ---------- the design screens' answers ----------
  func demoDeckPage() -> NetAnswer<PublicDeckPage>? {
    if props.netLoading { return nil }
    let X = NetSample.shared, P = X.P, pr = demoNet.pages
    var deck = X.DECKS["mcat"]!
    deck.stars += pr.starred ? 1 : 0
    // A teacher checked it on this screen (the canvas says Alex Kim did): its check is current now.
    if pr.checked { deck.checked = .init(name: "Alex Kim", handle: "alexkim", current: true) }
    return .ok(PublicDeckPage(deck: deck, helpers: [.init(handle: "devp", name: "Dev Patel")], contributors: [.init(handle: "devp", name: "Dev Patel", n: 6), .init(handle: "alexkim", name: "Alex Kim", n: 3)],
                              people: [P["maria"]!, P["dev"]!, P["okafor"]!, P["alex"]!], cardsList: PagesSample.shared.CARDS, moreCards: 634, made: PagesSample.shared.MADE,
                              me: .init(owner: pr.owner, studying: pr.studying ? "cell" : "", copied: pr.copied ? "cell" : "", watching: pr.watching, starred: pr.starred, open: pr.owner ? 3 : 0),
                              guide: GuideSample.publicGuide(props.guideState)))
  }
  func demoHistory() -> NetAnswer<HistoryPage>? {
    if props.netLoading { return nil }
    let X = NetSample.shared, list = PagesSample.shared.CELL_HISTORY
    var versions = list
    // Going back to a version (on this screen) adds a version saying so.
    if let v = demoNet.pages.restored, let top = list.first {
      let undone = list.filter { $0.version > v }.flatMap { $0.changes ?? [] }.prefix(3).map { c -> ChangeRow in
        var x = c; x.op = c.op == "add" ? "remove" : c.op == "remove" ? "add" : "edit"; x.kind = c.op == "add" ? "remove" : c.op == "remove" ? "new" : c.kind; x.before = c.after; x.after = c.before; return x
      }
      var back = top; back.version = top.version + 1; back.kind = "restore"; back.summary = "Went back to version \(v)"; back.ai = ""; back.at = "2026-09-28T09:58:00Z"; back.by = X.P["alex"]; back.changes = Array(undone)
      versions.insert(back, at: 0)
    }
    return .ok(HistoryPage(id: "s9", name: "Cell Biology", url: "/@alexkim/cell-biology", owner: X.P["alex"], mine: true, following: 214, versions: versions))
  }
  /// The sample's open suggestions, with what was decided on this screen.
  func demoSuggestions() -> NetAnswer<[SuggestionRow]>? {
    if props.netLoading { return nil }
    if demoNet.pages.noSuggestions { return .ok([]) }
    let rows = PagesSample.shared.SUGGESTIONS.map { s -> SuggestionRow in
      var s = s
      let pk = demoNet.pages.picks[s.id] ?? [:]
      s.changes = s.changes.map { c in
        var c = c
        if let v = pk[c.id] ?? pk["$all"], c.status == "open" { c.status = v == "take" ? "taken" : "skipped" }
        return c
      }
      return s
    }
    return .ok(rows.filter { $0.changes.contains { $0.status == "open" } })
  }
}
