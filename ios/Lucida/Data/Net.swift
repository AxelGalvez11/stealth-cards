// The study network (the server side is web/social.mjs; the web's client is web/net.js): shared decks, profiles,
// Discover, search, news. Screens ask for what they show while they draw; the first time, the answer isn't here yet
// (nil), so the screen shows its loading look, and it draws again when the answer arrives. Answers are kept for a little
// while, and anything you change drops them, so the next look is fresh (the old answer stays on the page until then).
import Foundation

// ---------- what the server answers ----------
/// Someone on the network: their handle, name, photo (or their color and initial), and a teacher's or school's check.
/// People found by search also have their school and how many follow them.
struct NetPerson: Decodable, Hashable {
  var handle = "", name = "", avatar: String? = nil, color = 0, verified = "", kind = "person"
  var bio = "", school = "", followers = 0
  enum CodingKeys: String, CodingKey { case handle, name, avatar, color, verified, kind, bio, school, followers }
  init(handle: String = "", name: String = "", color: Int = 0) { self.handle = handle; self.name = name; self.color = color }
  init(from d: Decoder) throws {
    let c = try d.container(keyedBy: CodingKeys.self)
    handle = c.v(.handle, ""); name = c.v(.name, ""); avatar = c.v(.avatar, nil); color = c.v(.color, 0); verified = c.v(.verified, ""); kind = c.v(.kind, "person")
    bio = c.v(.bio, ""); school = c.v(.school, ""); followers = c.v(.followers, 0)
  }
}

struct NetCover: Decodable {
  var style: String? = nil, round = 0, seed: String? = nil, image: String? = nil
  enum CodingKeys: String, CodingKey { case style, round, seed, image }
  init() {}
  init(from d: Decoder) throws {
    let c = try d.container(keyedBy: CodingKeys.self)
    style = c.v(.style, nil); round = c.v(.round, 0); seed = c.v(.seed, nil); image = c.v(.image, nil)
  }
}

/// A shared deck as a tile (social.mjs card): its page's address, name, cover, how many cards, saves, learners, and
/// copies, whether a teacher checked it, and whose it is. On a profile, `pinned` ones come first.
struct NetDeck: Decodable, Identifiable {
  struct Checked: Decodable {
    var name = "", handle = "", current = false
    enum CodingKeys: String, CodingKey { case name, handle, current }
    init(from d: Decoder) throws { let c = try d.container(keyedBy: CodingKeys.self); name = c.v(.name, ""); handle = c.v(.handle, ""); current = c.v(.current, false) }
  }
  var id = "", url = "", name = "", description = "", tags: [String] = []
  var cover = NetCover()
  var cards = 0, stars = 0, learners = 0, copies = 0, version = 1
  var updated = "", visibility = "public", maintained = "creator"
  var checked: Checked? = nil
  var owner: NetPerson? = nil
  var pinned = false
  enum CodingKeys: String, CodingKey { case id, url, name, description, tags, cover, cards, stars, learners, copies, version, updated, visibility, maintained, checked, owner, pinned }
  init(from d: Decoder) throws {
    let c = try d.container(keyedBy: CodingKeys.self)
    id = c.v(.id, ""); url = c.v(.url, ""); name = c.v(.name, ""); description = c.v(.description, ""); tags = c.v(.tags, []); cover = c.v(.cover, NetCover())
    cards = c.v(.cards, 0); stars = c.v(.stars, 0); learners = c.v(.learners, 0); copies = c.v(.copies, 0); version = c.v(.version, 1)
    updated = c.v(.updated, ""); visibility = c.v(.visibility, "public"); maintained = c.v(.maintained, "creator"); checked = c.v(.checked, nil)
    owner = c.v(.owner, nil); pinned = c.v(.pinned, false)
  }
}

/// A profile page (social.mjs profilePage): who they are, their numbers, the decks they share (pinned first), and on
/// your own, the decks you saved. `me`: you follow them, or it's you.
struct ProfilePage: Decodable {
  struct Me: Decodable {
    var isSelf = false, following = false
    enum CodingKeys: String, CodingKey { case isSelf = "self", following }
    init(isSelf: Bool, following: Bool) { self.isSelf = isSelf; self.following = following }
    init(from d: Decoder) throws { let c = try d.container(keyedBy: CodingKeys.self); isSelf = c.v(.isSelf, false); following = c.v(.following, false) }
  }
  var handle = "", name = "", avatar: String? = nil, color = 0, verified = "", kind = "person"
  var bio = "", school = "", subject = ""
  var followers = 0, following = 0, contributions = 0
  var featured: [String] = []
  var decks: [NetDeck] = [], saved: [NetDeck] = []
  var stars: Int? = nil
  var me: Me? = nil
  enum CodingKeys: String, CodingKey { case handle, name, avatar, color, verified, kind, bio, school, subject, followers, following, contributions, featured, decks, saved, stars, me }
  init(from d: Decoder) throws {
    let c = try d.container(keyedBy: CodingKeys.self)
    handle = c.v(.handle, ""); name = c.v(.name, ""); avatar = c.v(.avatar, nil); color = c.v(.color, 0); verified = c.v(.verified, ""); kind = c.v(.kind, "person")
    bio = c.v(.bio, ""); school = c.v(.school, ""); subject = c.v(.subject, "")
    followers = c.v(.followers, 0); following = c.v(.following, 0); contributions = c.v(.contributions, 0); featured = c.v(.featured, [])
    decks = c.v(.decks, []); saved = c.v(.saved, []); stars = c.v(.stars, nil); me = c.v(.me, nil)
  }
  var person: NetPerson { var p = NetPerson(handle: handle, name: name, color: color); p.avatar = avatar; p.verified = verified; p.kind = kind; return p }
}

/// Discover (social.mjs discover): its topics, and sections of decks (popular this week, from people you follow, checked
/// by teachers, new).
struct DiscoverPage: Decodable {
  struct Section: Decodable, Identifiable {
    var id = "", title = "", decks: [NetDeck] = []
    enum CodingKeys: String, CodingKey { case id, title, decks }
    init(id: String, title: String, decks: [NetDeck]) { self.id = id; self.title = title; self.decks = decks }
    init(from d: Decoder) throws { let c = try d.container(keyedBy: CodingKeys.self); id = c.v(.id, ""); title = c.v(.title, ""); decks = c.v(.decks, []) }
  }
  var topics: [String] = [], tag = "", sections: [Section] = []
  enum CodingKeys: String, CodingKey { case topics, tag, sections }
  init(topics: [String], tag: String, sections: [Section]) { self.topics = topics; self.tag = tag; self.sections = sections }
  init(from d: Decoder) throws { let c = try d.container(keyedBy: CodingKeys.self); topics = c.v(.topics, []); tag = c.v(.tag, ""); sections = c.v(.sections, []) }
}

/// Search (social.mjs search): decks and people.
struct SearchPage: Decodable {
  var q = "", decks: [NetDeck] = [], people: [NetPerson] = []
  enum CodingKeys: String, CodingKey { case q, decks, people }
  init(q: String = "", decks: [NetDeck] = [], people: [NetPerson] = []) { self.q = q; self.decks = decks; self.people = people }
  init(from d: Decoder) throws { let c = try d.container(keyedBy: CodingKeys.self); q = c.v(.q, ""); decks = c.v(.decks, []); people = c.v(.people, []) }
}

/// A deck news is about: its shared id, name, and page.
struct NetDeckRef: Decodable {
  var id = "", name = "", url = ""
  enum CodingKeys: String, CodingKey { case id, name, url }
  init(from d: Decoder) throws { let c = try d.container(keyedBy: CodingKeys.self); id = c.v(.id, ""); name = c.v(.name, ""); url = c.v(.url, "") }
}

/// One piece of news (social.mjs activity): a suggestion on your deck, someone following you, a new version of a deck
/// you follow, what an owner did with your suggestion, or a teacher checking your deck.
struct NewsItem: Decodable, Identifiable {
  struct Data: Decodable {
    var n = 0, took = 0, skipped = 0
    var message = "", summary = "", handle = ""
    enum CodingKeys: String, CodingKey { case n, took, skipped, message, summary, handle }
    init(from d: Decoder) throws {
      let c = try d.container(keyedBy: CodingKeys.self)
      n = c.v(.n, 0); took = c.v(.took, 0); skipped = c.v(.skipped, 0); message = c.v(.message, ""); summary = c.v(.summary, ""); handle = c.v(.handle, "")
    }
  }
  var id = "", kind = "", actorName = "", created = ""
  var person: NetPerson? = nil
  var deck: NetDeckRef? = nil
  var data: Data? = nil
  var read = false
  enum CodingKeys: String, CodingKey { case id, kind, actorName = "actor_name", created = "created_at", person, deck, data, read }
  init(from d: Decoder) throws {
    let c = try d.container(keyedBy: CodingKeys.self)
    // The server numbers them; keep the id as text (news.read sends them back).
    id = c.v(.id, Int?.none).map(String.init) ?? c.v(.id, "")
    kind = c.v(.kind, ""); actorName = c.v(.actorName, ""); created = c.v(.created, ""); person = c.v(.person, nil); deck = c.v(.deck, nil); data = c.v(.data, nil); read = c.v(.read, false)
  }
}
struct ActivityPage: Decodable {
  var unread = 0, items: [NewsItem] = []
  enum CodingKeys: String, CodingKey { case unread, items }
  init(unread: Int, items: [NewsItem]) { self.unread = unread; self.items = items }
  init(from d: Decoder) throws { let c = try d.container(keyedBy: CodingKeys.self); unread = c.v(.unread, 0); items = c.v(.items, []) }
}

/// A suggestion you sent (your profile's Suggestions): the deck it went to, what you said, when, and what became of
/// each change (open, taken, skipped, or gone).
struct SentSuggestion: Decodable, Identifiable {
  struct Change: Decodable {
    var status = "open"
    enum CodingKeys: String, CodingKey { case status }
    init(from d: Decoder) throws { status = try d.container(keyedBy: CodingKeys.self).v(.status, "open") }
  }
  var id = "", sharedId = "", message = "", created = ""
  var deck: NetDeckRef? = nil
  var changes: [Change] = []
  enum CodingKeys: String, CodingKey { case id, sharedId = "shared_id", message, created = "created_at", deck, changes }
  init(from d: Decoder) throws {
    let c = try d.container(keyedBy: CodingKeys.self)
    id = c.v(.id, ""); sharedId = c.v(.sharedId, ""); message = c.v(.message, ""); created = c.v(.created, ""); deck = c.v(.deck, nil); changes = c.v(.changes, [])
  }
}

/// Your shared decks (social.mjs mine): for each, who can see it, its numbers, what it says about itself, its helpers,
/// and how many suggestions wait.
struct MinePage: Decodable {
  struct Row: Decodable {
    var id = "", slug = "", visibility = "", description = "", maintained = "creator"
    var stars = 0, learners = 0, copies = 0, version = 1, open = 0
    var helpers: [LinkOwner] = []
    enum CodingKeys: String, CodingKey { case id, slug, visibility, description, maintained, stars, learners, copies, version, open, helpers }
    init(id: String, slug: String, visibility: String, description: String, stars: Int, learners: Int, copies: Int, open: Int, helpers: [LinkOwner]) {
      self.id = id; self.slug = slug; self.visibility = visibility; self.description = description; self.stars = stars; self.learners = learners; self.copies = copies; self.open = open; self.helpers = helpers
    }
    init(from d: Decoder) throws {
      let c = try d.container(keyedBy: CodingKeys.self)
      id = c.v(.id, ""); slug = c.v(.slug, ""); visibility = c.v(.visibility, ""); description = c.v(.description, ""); maintained = c.v(.maintained, "creator")
      stars = c.v(.stars, 0); learners = c.v(.learners, 0); copies = c.v(.copies, 0); version = c.v(.version, 1); open = c.v(.open, 0); helpers = c.v(.helpers, [])
    }
  }
  var handle = "", decks: [Row] = []
  enum CodingKeys: String, CodingKey { case handle, decks }
  init(handle: String, decks: [Row]) { self.handle = handle; self.decks = decks }
  init(from d: Decoder) throws { let c = try d.container(keyedBy: CodingKeys.self); handle = c.v(.handle, ""); decks = c.v(.decks, []) }
}

/// How people do on a shared deck of yours (Pro): its hardest cards, the share of times each was missed.
struct CreatorStats: Decodable {
  struct Hard: Decodable {
    var card = "", text = "", missed = 0
    enum CodingKeys: String, CodingKey { case card, text, missed }
    init(text: String, missed: Int) { self.text = text; self.missed = missed }
    init(from d: Decoder) throws { let c = try d.container(keyedBy: CodingKeys.self); card = c.v(.card, ""); text = c.v(.text, ""); missed = c.v(.missed, 0) }
  }
  var hardest: [Hard] = []
  enum CodingKeys: String, CodingKey { case hardest }
  init(hardest: [Hard]) { self.hardest = hardest }
  init(from d: Decoder) throws { hardest = try d.container(keyedBy: CodingKeys.self).v(.hardest, []) }
}

struct Unread: Decodable {
  var unread = 0
  enum CodingKeys: String, CodingKey { case unread }
  init(from d: Decoder) throws { unread = try d.container(keyedBy: CodingKeys.self).v(.unread, 0) }
}

/// An answer from the network (web/net.js get): what the server said, or that it isn't there (its status and words),
/// or that Lucida couldn't be reached.
enum NetAnswer<T> {
  case ok(T), missing(status: Int, error: String), offline
  var value: T? { if case .ok(let v) = self { return v }; return nil }
  var isMissing: Bool { if case .missing = self { return true }; return false }
  var isOffline: Bool { if case .offline = self { return true }; return false }
}

// ---------- the answers, kept for a little while ----------
/// Answers by address (web/net.js cache). `gen` counts changes: an answer from before the last change is asked for
/// again, but it stays on the page until the fresh one arrives, so a page doesn't flash its loading look after every
/// follow, save, or pin. `stamp` changes each time an entry gets a new answer (a page can tell a fresh one apart).
final class NetCache {
  struct Entry { var data: Any?; var at: Date; var busy: Bool; var gen: Int; var serial: Int; var stamp: Int }
  var entries: [String: Entry] = [:]
  var gen = 0, serial = 0, stamp = 0
}

extension Store {
  /// Asks the server for `path`'s answer, unless one from after the last change is here and fresh enough (`ttl`
  /// seconds). Returns what's here now: nil the first time.
  func netGet<T: Decodable>(_ path: String, ttl: TimeInterval = 20, _: T.Type) -> NetAnswer<T>? {
    let C = netCache
    if let e = C.entries[path], e.gen == C.gen, e.busy || Date().timeIntervalSince(e.at) < ttl { return e.data as? NetAnswer<T> }
    C.serial += 1
    let serial = C.serial, old = C.entries[path]?.data
    C.entries[path] = .init(data: old, at: .distantPast, busy: true, gen: C.gen, serial: serial, stamp: C.entries[path]?.stamp ?? 0)
    Task { [weak self] in
      guard let self else { return }
      var got: NetAnswer<T>?
      do {
        let (status, data) = try await self.api.get(path)
        if (200..<300).contains(status), let v = try? JSONDecoder().decode(T.self, from: data) { got = .ok(v) }
        else { got = .missing(status: status, error: ((try? JSONSerialization.jsonObject(with: data)) as? [String: Any])?["error"] as? String ?? "") }
      }
      catch APIError.signedOut { got = .missing(status: 401, error: "") }
      catch { got = nil }
      guard var e = C.entries[path], e.serial == serial else { return }
      if let got { e.data = got; C.stamp += 1; e.stamp = C.stamp } else if e.data == nil { e.data = NetAnswer<T>.offline; C.stamp += 1; e.stamp = C.stamp }
      e.busy = false; e.at = Date()
      C.entries[path] = e
      self.objectWillChange.send()
    }
    return old as? NetAnswer<T>
  }
  /// Which answer `path` has now (changes each time a new one arrives).
  func netStamp(_ path: String) -> Int { netCache.entries[path]?.stamp ?? 0 }
  /// Something changed: every answer is asked for again the next time a page shows it.
  func netDrop() { netCache.gen += 1 }

  /// A change on the network (web/net.js act): the library comes back with it, and the answers are asked for again.
  /// A plain message comes back as the error when it didn't work.
  @discardableResult
  func social(_ type: String, _ payload: [String: Any] = [:]) async throws -> [String: Any] {
    do {
      let r = try await api.social(type, payload)
      if let st = r.state { accept(st) }
      netDrop()
      objectWillChange.send()
      return r.result
    } catch APIError.signedOut {
      phase = .signedOut
      throw APIError.server("Sign in to Lucida.")
    }
  }

  // ---------- the pages' answers ----------
  func netProfile(_ h: String) -> NetAnswer<ProfilePage>? {
    if demo { return demoProfile(h) }
    return netGet("api/public/profile?h=" + enc(h), ProfilePage.self)
  }
  func netDiscover(_ tag: String) -> NetAnswer<DiscoverPage>? {
    if demo { return props.netLoading ? nil : .ok(demoDiscover()) }
    return netGet("api/public/discover?tag=" + enc(tag), DiscoverPage.self)
  }
  func netSearch(_ q: String) -> NetAnswer<SearchPage>? {
    let words = q.trimmingCharacters(in: .whitespacesAndNewlines)
    if words.isEmpty { return .ok(SearchPage()) }
    if demo { return props.netLoading ? nil : .ok(demoSearch(words)) }
    return netGet("api/public/search?q=" + enc(words), ttl: 60, SearchPage.self)
  }
  func netActivity() -> NetAnswer<ActivityPage>? {
    if demo { return props.netLoading ? nil : .ok(demoActivity()) }
    return netGet("api/social/activity", ttl: 15, ActivityPage.self)
  }
  /// How much news is new, for the bell (a small question, asked at most once a minute).
  func netUnread() -> Int {
    if demo { return demoNet.read ? 0 : 2 }
    return netGet("api/social/unread", ttl: 60, Unread.self)?.value?.unread ?? 0
  }
  func netSent() -> NetAnswer<[SentSuggestion]>? {
    if demo { return props.netLoading ? nil : .ok(props.netEmpty ? [] : NetSample.shared.SENT) }
    return netGet("api/social/suggestions?mine=1", [SentSuggestion].self)
  }
  func netMine() -> MinePage? {
    if demo { return demoMine() }
    return netGet("api/social/mine", ttl: 30, MinePage.self)?.value
  }
  func netStats(_ sharedId: String) -> CreatorStats? {
    if demo { return CreatorStats(hardest: [.init(text: "Which enzyme is the rate-limiting step of glycolysis?", missed: 41), .init(text: "What does the electron transport chain pump across the inner membrane?", missed: 28), .init(text: "The citric acid cycle produces NADH and ___.", missed: 19)]) }
    return netGet("api/social/stats?id=" + enc(sharedId), ttl: 60, CreatorStats.self)?.value
  }

  /// You on the network (db.js me): your handle (once you have a profile) and your name.
  var myHandle: String { demo ? (demoNet.profile["handle"] as? String ?? "alexkim") : lib.profile?.handle ?? "" }
  var myName: String {
    if demo { return "Alex Kim" }
    return settings.name.nilIfEmpty ?? lib.me?.name.nilIfEmpty ?? "You"
  }
  /// A page on the web app (a shared deck's page, its History, its suggestions), for pages the iPhone app doesn't draw yet.
  func webURL(_ path: String) -> URL? { URL(string: API.base.absoluteString.replacingOccurrences(of: "/$", with: "", options: .regularExpression) + (path.hasPrefix("/") ? path : "/" + path)) }
  /// A link people can open (a profile, a deck): on Lucida's own site, lucida.cards; elsewhere (a copy of the server on
  /// a computer), that server's address.
  func shareLink(_ path: String) -> String {
    let base = demo || API.base.host?.hasSuffix("lucida.cards") == true ? "https://app.lucida.cards" : API.base.absoluteString.replacingOccurrences(of: "/$", with: "", options: .regularExpression)
    return base + path
  }

  // ---------- changes ----------
  func follow(_ handle: String, _ on: Bool) async throws {
    if demo { demoNet.follows[handle] = on; return }
    try await social("user.follow", ["handle": handle, "on": on])
  }
  /// Saves your profile's changes (handle, bio, school, subject, pinned decks); the handle it has now comes back.
  @discardableResult
  func updateProfile(_ patch: [String: Any]) async throws -> String {
    if demo {
      if let h = (patch["handle"] as? String)?.lowercased(), !h.isEmpty,
         NetSample.shared.P.values.contains(where: { $0.handle == h && $0.handle != "alexkim" }) {
        throw APIError.server("That name is taken. Try another.")
      }
      for (k, v) in patch { demoNet.profile[k] = v }
      return myHandle
    }
    let r = try await social("profile.update", ["patch": patch])
    return r["handle"] as? String ?? myHandle
  }
  /// Your profile, made the first time it's needed (the handle comes from your name).
  @discardableResult
  func ensureProfile() async throws -> String {
    if demo { return myHandle }
    let r = try await social("profile.ensure")
    return r["handle"] as? String ?? myHandle
  }
  func readNews() async {
    if demo { demoNet.read = true; return }
    _ = try? await social("news.read", ["ids": NSNull()])
  }
  func shareDeck(_ deckId: String, _ o: [String: Any]) async throws {
    if demo { if let v = o["visibility"] as? String { demoNet.vis = v }; return }
    var p = o; p["deckId"] = deckId
    try await social("deck.share", p)
  }
  func detach(_ deckId: String) async throws {
    if demo { demoNet.detached = true; return }
    try await social("deck.detach", ["deckId": deckId])
  }
  func takeUpdates(_ deckId: String, _ picks: [String: String]) async throws {
    if demo { demoNet.took = true; return }
    try await social("deck.updates", ["deckId": deckId, "picks": picks])
  }
  func copyUpdates(_ deckId: String, _ on: Bool) async throws {
    if demo { demoNet.upd = on; return }
    try await social("deck.copyUpdates", ["deckId": deckId, "on": on])
  }

  private func enc(_ s: String) -> String { s.addingPercentEncoding(withAllowedCharacters: .alphanumerics) ?? s }
}

// ---------- numbers and dates, the way the pages write them ----------
enum NetFmt {
  /// 1300 as "1.3k", 12400 as "12k" (NET_JS kfmt).
  static func k(_ n: Int) -> String {
    if n >= 10000 { return "\(Int((Double(n) / 1000).rounded(.toNearestOrAwayFromZero)))k" }
    if n >= 1000 { let tenths = Int((Double(n) / 100).rounded(.toNearestOrAwayFromZero)); return tenths % 10 == 0 ? "\(tenths / 10)k" : "\(tenths / 10).\(tenths % 10)k" }
    return String(n)
  }
  static let months3 = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
  static func date(_ iso: String) -> Date? {
    let a = ISO8601DateFormatter(), b = ISO8601DateFormatter()
    b.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
    return a.date(from: iso) ?? b.date(from: iso)
  }
  /// How long ago (NET_JS ago): Just now, 5 min ago, 3h ago, Yesterday, 4 days ago, or the day (the design screens always
  /// show the day, like the canvas).
  static func ago(_ iso: String, demo: Bool) -> String {
    guard let d = date(iso) else { return "" }
    var cal = Calendar(identifier: .gregorian)
    if demo {
      cal.timeZone = TimeZone(identifier: "UTC")!
      return months3[cal.component(.month, from: d) - 1] + " \(cal.component(.day, from: d))"
    }
    let m = max(0, Int((Date().timeIntervalSince(d) / 60).rounded(.toNearestOrAwayFromZero)))
    if m < 1 { return "Just now" }
    if m < 60 { return "\(m) min ago" }
    let h = Int((Double(m) / 60).rounded(.toNearestOrAwayFromZero))
    if h < 24 { return "\(h)h ago" }
    let dd = Int((Double(h) / 24).rounded(.toNearestOrAwayFromZero))
    if dd == 1 { return "Yesterday" }
    if dd < 7 { return "\(dd) days ago" }
    return months3[cal.component(.month, from: d) - 1] + " \(cal.component(.day, from: d))"
  }
}

// ---------- the design screens' sample (design/net-sample.mjs, as mock.mjs answers with it) ----------
struct NetSample: Decodable {
  struct Discover: Decodable {
    struct Section: Decodable { let id: String; let title: String; let decks: [String] }
    let topics: [String]; let sections: [Section]
  }
  let P: [String: NetPerson]
  let DECKS: [String: NetDeck]
  let ALEX_DECKS: [NetDeck]
  let SENT: [SentSuggestion]
  let NEWS: [NewsItem]
  let PROFILE: ProfilePage
  let OTHER: ProfilePage
  let DISCOVER: Discover
  static let shared: NetSample = try! JSONDecoder().decode(NetSample.self, from: Data(Generated.netSampleJSON.utf8))
}

/// What a design screen changed on the network (mock.mjs `$m`): follows, your profile's edits and pins, news read, and
/// the sample deck's sharing.
struct DemoNet {
  var follows: [String: Bool] = [:]
  var profile: [String: Any] = [:]
  var read = false
  /// The sample deck's Who can see it (nil: the board's `shared`), made your own, its changes taken, and Get updates.
  var vis: String? = nil
  var detached = false, took = false
  var upd: Bool? = nil
}

extension Store {
  private var X: NetSample { NetSample.shared }
  func demoDiscover() -> DiscoverPage {
    DiscoverPage(topics: X.DISCOVER.topics, tag: "", sections: X.DISCOVER.sections.map { s in .init(id: s.id, title: s.title, decks: s.decks.compactMap { X.DECKS[$0] }) })
  }
  func demoSearch(_ q: String) -> SearchPage {
    var maria = X.P["maria"]!, okafor = X.P["okafor"]!
    maria.bio = "Biochem TA"; maria.school = "UC Davis"; maria.followers = 1280
    okafor.school = "UC Davis"; okafor.followers = 3400
    return SearchPage(q: q, decks: ["mcat", "bio2a", "cell"].compactMap { X.DECKS[$0] }, people: [maria, okafor])
  }
  /// Maria's profile for any other handle (the board's `following`: you follow her), or yours, with what you changed on
  /// this screen (your handle, bio, pins).
  func demoProfile(_ h: String) -> NetAnswer<ProfilePage>? {
    if props.netLoading { return nil }
    if props.missing { return .missing(status: 404, error: "No one has that name.") }
    let mine = myHandle
    if !h.isEmpty && h != mine {
      var p = X.OTHER
      let was = props.following, on = demoNet.follows[h] ?? was
      p.followers += (on ? 1 : 0) - (was ? 1 : 0)
      p.decks = props.netEmpty ? [] : ["mcat", "spanish"].compactMap { X.DECKS[$0] }.enumerated().map { i, d in var d = d; d.pinned = i == 0; return d }
      p.saved = []
      p.me = .init(isSelf: false, following: on)
      return .ok(p)
    }
    var p = X.PROFILE
    p.handle = mine
    if let v = demoNet.profile["bio"] as? String { p.bio = v }
    if let v = demoNet.profile["school"] as? String { p.school = v }
    if let v = demoNet.profile["subject"] as? String { p.subject = v }
    if let v = demoNet.profile["featured"] as? [String] { p.featured = v }
    let feat = p.featured
    p.decks = props.netEmpty ? [] : X.ALEX_DECKS.map { d in var d = d; d.pinned = feat.contains(d.id); return d }
    if props.netEmpty { p.followers = 0; p.following = 0 }
    p.stars = p.decks.reduce(0) { $0 + $1.stars }
    p.saved = props.netEmpty ? [] : ["mcat", "kanji", "bio2a"].compactMap { X.DECKS[$0] }
    p.me = .init(isSelf: true, following: false)
    return .ok(p)
  }
  func demoActivity() -> ActivityPage {
    if props.netEmpty { return ActivityPage(unread: 0, items: []) }
    return ActivityPage(unread: demoNet.read ? 0 : 2, items: X.NEWS.map { x in var x = x; if demoNet.read { x.read = true }; return x })
  }
  func demoMine() -> MinePage {
    MinePage(handle: "alexkim", decks: [.init(id: "s9", slug: "cell-biology", visibility: "public", description: "For BIO 201. Suggestions welcome.", stars: 1300, learners: 214, copies: 86, open: 3,
                                              helpers: [LinkOwner(name: "Dev Patel", handle: "devp")])])
  }
}
