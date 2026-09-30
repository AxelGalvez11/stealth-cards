// Classes and schools (the server side is web/classes.mjs; the web's client is web/net.js and web/db.js): a study group
// a teacher can also run. You make one or join one with its 6-letter code, and the owner (and helpers) add decks and
// assign them (learn every card, or review what's due each day, by a date). Progress is the one thing that's ever
// shared, and only when a member turns it on: the owner and helpers then see how far each of them is on every
// assignment (cards learned, cards due, how often they remembered, when they last studied), never their answers.
import Foundation

// ---------- what the server answers ----------
/// A class in your library (classes.mjs keep): what Today needs, with its assignments.
struct LibClass: Decodable, Identifiable {
  struct Asg: Decodable, Identifiable {
    var id = "", sharedId = "", name = "", cards = 0, goal = "learn", due = ""
    var cover = NetCover()
    enum CodingKeys: String, CodingKey { case id, sharedId, name, cards, cover, goal, due }
    init(from d: Decoder) throws {
      let c = try d.container(keyedBy: CodingKeys.self)
      id = c.v(.id, ""); sharedId = c.v(.sharedId, ""); name = c.v(.name, ""); cards = c.v(.cards, 0); cover = c.v(.cover, NetCover()); goal = c.v(.goal, "learn"); due = c.v(.due, "")
    }
  }
  var id = "", code = "", name = "", school = "", role = "member", share = false, owner = ""
  var assignments: [Asg] = []
  enum CodingKeys: String, CodingKey { case id, code, name, school, role, share, owner, assignments }
  init(from d: Decoder) throws {
    let c = try d.container(keyedBy: CodingKeys.self)
    id = c.v(.id, ""); code = c.v(.code, ""); name = c.v(.name, ""); school = c.v(.school, ""); role = c.v(.role, "member"); share = c.v(.share, false)
    owner = c.v(.owner, ""); assignments = c.v(.assignments, [])
  }
}

/// One of your classes in Library → Classes (classes.mjs mine): whose it is and how big.
struct ClassRow: Decodable, Identifiable {
  var id = "", code = "", name = "", school = "", role = "member", share = false
  var owner = NetPerson(), official = false
  var people = 0, decks = 0, assignments = 0
  enum CodingKeys: String, CodingKey { case id, code, name, school, role, share, owner, official, people, decks, assignments }
  init(from d: Decoder) throws {
    let c = try d.container(keyedBy: CodingKeys.self)
    id = c.v(.id, ""); code = c.v(.code, ""); name = c.v(.name, ""); school = c.v(.school, ""); role = c.v(.role, "member"); share = c.v(.share, false)
    owner = c.v(.owner, NetPerson()); official = c.v(.official, false); people = c.v(.people, 0); decks = c.v(.decks, 0); assignments = c.v(.assignments, 0)
  }
}

/// How far one member is on one assignment, as they chose to share it (web/progress.js): cards learned of all, cards due
/// now, how often they remembered a card when it came back (the last 30 days), and when they last studied.
struct ClassProgress: Decodable, Equatable {
  var learned = 0, total = 0, due = 0
  var remembered: Int? = nil
  var last: String? = nil
  enum CodingKeys: String, CodingKey { case learned, total, due, remembered, last }
  init(learned: Int, total: Int, due: Int, remembered: Int? = nil, last: String? = nil) { self.learned = learned; self.total = total; self.due = due; self.remembered = remembered; self.last = last }
  init(from d: Decoder) throws {
    let c = try d.container(keyedBy: CodingKeys.self)
    learned = c.v(.learned, 0); total = c.v(.total, 0); due = c.v(.due, 0); remembered = c.v(.remembered, nil); last = c.v(.last, nil)
  }
}

/// Someone in a class: who they are, their place in it, and (for the owner and helpers) whether they share progress.
struct ClassMember: Decodable, Identifiable {
  var person = NetPerson()
  var role = "member", share = false, you = false
  var id: String { person.handle }
  enum CodingKeys: String, CodingKey { case role, share, you }
  init(from d: Decoder) throws {
    person = try NetPerson(from: d)
    let c = try d.container(keyedBy: CodingKeys.self)
    role = c.v(.role, "member"); share = c.v(.share, false); you = c.v(.you, false)
  }
}

/// A deck in a class: the shared deck's tile, who added it, and whether it's yours to take out.
struct ClassDeck: Decodable, Identifiable {
  var deck: NetDeck
  var addedBy = "", mine = false
  var id: String { deck.id }
  enum CodingKeys: String, CodingKey { case addedBy, mine }
  init(from d: Decoder) throws {
    deck = try NetDeck(from: d)
    let c = try d.container(keyedBy: CodingKeys.self)
    addedBy = c.v(.addedBy, ""); mine = c.v(.mine, false)
  }
}

/// A deck assigned to a class: learn every card, or review what's due each day, by a date; for the owner and helpers,
/// with each member's progress (by handle).
struct ClassAssignment: Decodable, Identifiable {
  struct Deck: Decodable {
    var name = "", cards = 0, url = ""
    var cover = NetCover()
    enum CodingKeys: String, CodingKey { case name, cover, cards, url }
    init(name: String = "", cards: Int = 0, url: String = "", cover: NetCover = NetCover()) { self.name = name; self.cards = cards; self.url = url; self.cover = cover }
    init(from d: Decoder) throws {
      let c = try d.container(keyedBy: CodingKeys.self)
      name = c.v(.name, ""); cover = c.v(.cover, NetCover()); cards = c.v(.cards, 0); url = c.v(.url, "")
    }
  }
  var id = "", sharedId = "", goal = "learn", due = ""
  var deck = Deck()
  var progress: [String: ClassProgress]? = nil
  enum CodingKeys: String, CodingKey { case id, sharedId, goal, due, deck, progress }
  init(id: String, sharedId: String, goal: String, due: String, deck: Deck) { self.id = id; self.sharedId = sharedId; self.goal = goal; self.due = due; self.deck = deck; progress = [:] }
  init(from d: Decoder) throws {
    let c = try d.container(keyedBy: CodingKeys.self)
    id = c.v(.id, ""); sharedId = c.v(.sharedId, ""); goal = c.v(.goal, "learn"); due = c.v(.due, ""); deck = c.v(.deck, Deck()); progress = c.v(.progress, nil)
  }
}

/// A class's page (classes.mjs page): someone who isn't in it gets its invite (`invite`: name, whose, how many people and
/// decks); people in it get its decks, assignments, and people, and the owner and helpers also each member's progress.
struct ClassPage: Decodable {
  struct Me: Decodable {
    var role = "", share = false, asked = false
    enum CodingKeys: String, CodingKey { case role, share, asked }
    init(from d: Decoder) throws { let c = try d.container(keyedBy: CodingKeys.self); role = c.v(.role, ""); share = c.v(.share, false); asked = c.v(.asked, false) }
  }
  var id = "", code = "", name = "", school = ""
  var owner = NetPerson(), official = false
  var people = 0, decks = 0
  var invite = false
  var me: Me? = nil
  var helpers: [String] = []
  var members: [ClassMember] = []
  var deckList: [ClassDeck] = []
  var assignments: [ClassAssignment] = []
  enum CodingKeys: String, CodingKey { case id, code, name, school, owner, official, people, decks, invite, me, helpers, members, deckList, assignments }
  init(from d: Decoder) throws {
    let c = try d.container(keyedBy: CodingKeys.self)
    id = c.v(.id, ""); code = c.v(.code, ""); name = c.v(.name, ""); school = c.v(.school, ""); owner = c.v(.owner, NetPerson()); official = c.v(.official, false)
    people = c.v(.people, 0); decks = c.v(.decks, 0); invite = c.v(.invite, false); me = c.v(.me, nil); helpers = c.v(.helpers, [])
    members = c.v(.members, []); deckList = c.v(.deckList, []); assignments = c.v(.assignments, [])
  }
}

/// Whether you're verified as a teacher or a school, or waiting to hear (classes.mjs verifyStatus).
struct VerifyStatus: Decodable {
  var verified = "", open = false, declined = false, role = "", school = ""
  enum CodingKeys: String, CodingKey { case verified, open, declined, role, school }
  init() {}
  init(from d: Decoder) throws {
    let c = try d.container(keyedBy: CodingKeys.self)
    verified = c.v(.verified, ""); open = c.v(.open, false); declined = c.v(.declined, false); role = c.v(.role, ""); school = c.v(.school, "")
  }
}

/// How far you are on a class's deck, worked out from your own cards (web/progress.js progressOf) and put under the deck's
/// own id in your library: cards learned, cards due now, how often you remembered a card when it came back, and when you
/// last studied. Never your answers.
struct MyProgress: Decodable, Equatable {
  var deckId = "", learned = 0, total = 0, due = 0
  var remembered: Int? = nil
  enum CodingKeys: String, CodingKey { case deckId, learned, total, due, remembered }
  init(deckId: String, learned: Int, total: Int, due: Int, remembered: Int? = nil) { self.deckId = deckId; self.learned = learned; self.total = total; self.due = due; self.remembered = remembered }
  init(from d: Decoder) throws {
    let c = try d.container(keyedBy: CodingKeys.self)
    deckId = c.v(.deckId, ""); learned = c.v(.learned, 0); total = c.v(.total, 0); due = c.v(.due, 0); remembered = c.v(.remembered, nil)
  }
}

/// The canvas's classes (design/net-sample.mjs): BIO 201 (yours), Organic Chemistry (you're in it), the pre-med study
/// group (an invite), the list, what Today shows, and your own progress on the class decks you study.
struct ClassSample: Decodable {
  struct Assigned: Decodable {
    var id = "", classId = "", className = "", code = "", sharedId = "", name = "", goal = "learn", due = "", cards = 0
    var cover = NetCover()
    var progress: MyProgress? = nil
    enum CodingKeys: String, CodingKey { case id, classId, className, code, sharedId, name, goal, due, cards, cover, progress }
    init(from d: Decoder) throws {
      let c = try d.container(keyedBy: CodingKeys.self)
      id = c.v(.id, ""); classId = c.v(.classId, ""); className = c.v(.className, ""); code = c.v(.code, ""); sharedId = c.v(.sharedId, ""); name = c.v(.name, "")
      goal = c.v(.goal, "learn"); due = c.v(.due, ""); cards = c.v(.cards, 0); cover = c.v(.cover, NetCover()); progress = c.v(.progress, nil)
    }
  }
  let CLASSES: [String: ClassPage]
  let CLASS_LIST: [ClassRow]
  let MY_PROGRESS: [String: MyProgress]
  let ASSIGNED: [Assigned]
  static let shared: ClassSample = try! JSONDecoder().decode(ClassSample.self, from: Data(Generated.netSampleJSON.utf8))
}

/// What a design screen changed on a class (mock.mjs `$m`): an invite taken, sharing answered, people made helpers or
/// taken out, decks taken out, decks assigned or assignments removed, and a request to be verified.
struct DemoClass {
  var joined = false, verifySent = false
  var share: [String: Bool] = [:]
  var roles: [String: String] = [:], out: Set<String> = [], takenOut: Set<String> = [], unassigned: Set<String> = []
  var assigned: [(classId: String, a: ClassAssignment)] = []
  /// A deck added to the class in the Add a deck sheet (by the library deck's name).
  var added: Set<String> = []
}

// ---------- your progress, and what Today lists ----------
/// One row of Today's Assignments (db.js assignments): a deck a class gave you, and how it's going.
struct AssignmentRow: Identifiable {
  var id = "", classId = "", className = "", code = "", sharedId = "", name = "", goal = "learn", due = ""
  var cards = 0
  var cover = NetCover()
  var progress: MyProgress? = nil
  var done = false
  var at = Date.distantPast
}

/// The words a class's pages use (design/build.mjs CLASS_JS): a due date as "due Friday", "until Oct 9", "was due
/// yesterday"; what's left for you ("12 cards left", "4 to review", "Caught up", "Done"); and lists of names.
enum ClassWords {
  static let days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"]
  static let mon3 = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
  static var cal: Calendar { var c = Calendar(identifier: .gregorian); c.timeZone = .current; return c }

  /// A YYYY-MM-DD date as local midnight.
  static func dateAt(_ v: String) -> Date {
    let x = v.split(separator: "-").compactMap { Int($0) }
    var dc = DateComponents(); dc.year = x.count > 0 ? x[0] : 2026; dc.month = x.count > 1 ? x[1] : 1; dc.day = x.count > 2 ? x[2] : 1
    return cal.date(from: dc) ?? Date()
  }
  /// A day as YYYY-MM-DD, the way an assignment keeps its date.
  static func isoDay(_ d: Date) -> String {
    let c = cal.dateComponents([.year, .month, .day], from: d)
    return String(format: "%04d-%02d-%02d", c.year ?? 2026, c.month ?? 1, c.day ?? 1)
  }
  /// today, tomorrow, yesterday, a weekday within a week, or the day (Oct 9).
  static func dayWord(_ v: String, today: Date) -> String {
    let at = dateAt(v), n = Int((at.timeIntervalSince(today) / 86400).rounded())
    return n == 0 ? "today" : n == 1 ? "tomorrow" : n == -1 ? "yesterday" : abs(n) < 7 ? days[cal.component(.weekday, from: at) - 1] : mon3[cal.component(.month, from: at) - 1] + " \(cal.component(.day, from: at))"
  }
  static func dueWord(_ goal: String, _ v: String, today: Date) -> String {
    (dateAt(v) < today ? "was due " : goal == "daily" ? "until " : "due ") + dayWord(v, today: today)
  }
  static func goalWord(_ g: String) -> String { g == "daily" ? "Review what’s due" : "Learn every card" }
  static func nOf(_ n: Int, _ w: String, _ ws: String? = nil) -> String { "\(n) " + (n == 1 ? w : ws ?? w + "s") }
  static func andList(_ a: [String]) -> String {
    a.count < 2 ? a.joined() : a.count == 2 ? a.joined(separator: " and ") : a.dropLast().joined(separator: ", ") + ", and " + a[a.count - 1]
  }
  /// What's left for you on an assignment, from your own cards: 12 cards left, 4 to review, Caught up, Done.
  static func leftWord(goal: String, cards: Int, _ pr: MyProgress?) -> String {
    guard let pr else { return goal == "daily" ? "Not started" : nOf(cards, "card") }
    if goal == "daily" { return pr.learned == 0 ? "Not started" : pr.due > 0 ? "\(pr.due) to review" : "Caught up" }
    return pr.total > 0 && pr.learned >= pr.total ? "Done" : nOf(max(0, pr.total - pr.learned), "card") + " left"
  }
  /// An assignment is done when every card is learned (Learn every card), or, for Review what's due, once you've started
  /// and nothing is due right now (web/progress.js doneOf).
  static func isDone(goal: String, learned: Int, total: Int, due: Int) -> Bool {
    goal == "daily" ? learned > 0 && due == 0 : total > 0 && learned >= total
  }
  static func isDone(goal: String, _ pr: MyProgress?) -> Bool { pr.map { isDone(goal: goal, learned: $0.learned, total: $0.total, due: $0.due) } ?? false }
  static func isDone(goal: String, _ pr: ClassProgress?) -> Bool { pr.map { isDone(goal: goal, learned: $0.learned, total: $0.total, due: $0.due) } ?? false }
}

extension Store {
  /// Today on the design screens is the canvas's Monday, September 28; otherwise it's today.
  var classToday: Date {
    if demo { return ClassWords.dateAt("2026-09-28") }
    return Calendar.current.startOfDay(for: Date())
  }

  /// How far you are on a class's deck: worked out from your own cards, the way the server works it out for a class you
  /// share it with (web/progress.js progressOf); nil until you study the deck.
  func classProgress(_ sharedId: String) -> MyProgress? {
    if demo { return ClassSample.shared.MY_PROGRESS[sharedId] }
    guard let d = lib.decks.first(where: { $0.link?.id == sharedId && $0.link?.gone == false }) else { return nil }
    let now = nowMs(), piles = d.grading == "piles", timed = d.fsrs && !piles
    let cs = lib.cards.filter { $0.deckId == d.id && !$0.pending }
    let learned = cs.filter { piles ? $0.pile != nil : timed ? ($0.srs.state == "review" || $0.srs.state == "relearning") : $0.srs.reps > 0 }.count
    let due = timed ? cs.filter { $0.srs.state != "new" && $0.srs.due <= now }.count : 0
    let back = lib.logs.filter { $0.deckId == d.id && $0.at >= now - 30 * DAY && ($0.rating ?? 0) != 0 && $0.was == "review" }
    let remembered = back.isEmpty ? nil : Int((Double(back.filter { ($0.rating ?? 0) > 1 }.count) / Double(back.count) * 100).rounded())
    return MyProgress(deckId: d.id, learned: learned, total: cs.count, due: due, remembered: remembered)
  }

  /// What Today lists: the assignments of the classes you're a member of, soonest first. A done one stays until its date
  /// passes, one that isn't done until two weeks after (db.js assignments).
  func assignmentRows() -> [AssignmentRow] {
    let t0 = classToday
    if demo {
      guard props.assignments else { return [] }
      return ClassSample.shared.ASSIGNED.map { a in
        AssignmentRow(id: a.id, classId: a.classId, className: a.className, code: a.code, sharedId: a.sharedId, name: a.name, goal: a.goal, due: a.due, cards: a.cards, cover: a.cover,
                      progress: a.progress, done: ClassWords.isDone(goal: a.goal, a.progress), at: ClassWords.dateAt(a.due))
      }
    }
    return lib.classes.filter { $0.role == "member" }.flatMap { k in
      k.assignments.map { a -> AssignmentRow in
        let p = classProgress(a.sharedId)
        return AssignmentRow(id: a.id, classId: k.id, className: k.name, code: k.code, sharedId: a.sharedId, name: a.name, goal: a.goal, due: a.due, cards: a.cards, cover: a.cover,
                             progress: p, done: ClassWords.isDone(goal: a.goal, p), at: ClassWords.dateAt(a.due))
      }
    }
    .filter { $0.at >= t0 || (!$0.done && $0.at >= t0.addingTimeInterval(-14 * 86400)) }
    .sorted { $0.at < $1.at }
  }

  /// After a study session, a class you share your progress with hears how far you got, without waiting for the app to
  /// open again (db.js classSync).
  func classSync() {
    guard !demo, lib.classes.contains(where: { $0.role == "member" && $0.share && !$0.assignments.isEmpty }) else { return }
    Task { _ = try? await api.social("class.sync", [:]) }
  }

  // ---------- the pages' answers ----------
  func netClasses() -> NetAnswer<[ClassRow]>? {
    if demo {
      if props.netLoading { return nil }
      return .ok(props.netEmpty ? [] : ClassSample.shared.CLASS_LIST)
    }
    return netGet("api/classes", [ClassRow].self)
  }
  /// A class's page, or its invite (nil while it loads; not there: `.missing`).
  func netClass(_ code: String) -> NetAnswer<ClassPage>? {
    if demo { return demoClassPage(code) }
    return netGet("api/public/class?code=" + (code.addingPercentEncoding(withAllowedCharacters: .alphanumerics) ?? code), ClassPage.self)
  }
  /// Whether you're verified, or waiting (for Get verified).
  func netVerify() -> VerifyStatus {
    if demo { var v = VerifyStatus(); v.open = demoClass.verifySent; v.school = "UC Davis"; return v }
    return netGet("api/verify", ttl: 60, VerifyStatus.self)?.value ?? VerifyStatus()
  }

  /// A class as the design screens show it: the canvas's own, with what you did on this screen (an invite taken, sharing
  /// answered, helpers, decks and assignments changed).
  func demoClassPage(_ code: String) -> NetAnswer<ClassPage>? {
    if props.netLoading { return nil }
    if props.missing { return .missing(status: 404, error: "No class has that code.") }
    let X = ClassSample.shared, k0 = X.CLASSES[code] ?? X.CLASSES["BIOKTZ"]!, D = demoClass
    var k = k0
    if k0.invite {
      guard D.joined else { return .ok(k0) }
      k = X.CLASSES["ORGCHM"]!
      k.id = k0.id; k.code = k0.code; k.name = k0.name; k.owner = k0.owner; k.people = k0.people + 1; k.me = ClassPage.Me(role: "member", share: false, asked: false); k.assignments = []
    }
    if let s = D.share[k0.id] { k.me = ClassPage.Me(role: k.me?.role ?? "member", share: s, asked: true) }
    else if props.classSharing { k.me = ClassPage.Me(role: k.me?.role ?? "member", share: true, asked: true) }
    k.members = k.members.filter { !D.out.contains($0.person.handle) }.map { m in var m = m; if let r = D.roles[m.person.handle] { m.role = r }; return m }
    k.deckList = k.deckList.filter { !D.takenOut.contains($0.deck.id) }
    let decks = k.deckList
    k.assignments = k.assignments.filter { a in !D.unassigned.contains(a.id) && decks.contains { $0.deck.id == a.sharedId } } + D.assigned.filter { $0.classId == k0.id }.map(\.a)
    k.people = k.members.count; k.decks = k.deckList.count
    if props.netEmpty { k.members = k.members.filter { $0.role == "owner" }; k.people = 1; k.deckList = []; k.decks = 0; k.assignments = [] }
    return .ok(k)
  }
}

extension ClassPage.Me {
  init(role: String, share: Bool, asked: Bool) { self.role = role; self.share = share; self.asked = asked }
}

// ---------- changes (web/db.js act.*) ----------
// Each one gives back what the server said; when it didn't work the server's own words come back as the error, and the
// page shows them. Making or joining a class opens it.
extension Store {
  /// Makes a class; its code comes back.
  func makeClass(name: String, school: String) async throws -> String {
    if demo { return "BIOKTZ" }
    let r = try await social("class.make", ["name": name, "school": school])
    return r["code"] as? String ?? ""
  }
  /// Joins a class with its 6-letter code; the code comes back.
  func joinClass(_ code: String) async throws -> String {
    if demo { demoClass.joined = true; return code }
    let r = try await social("class.join", ["code": code])
    return r["code"] as? String ?? code
  }
  func leaveClass(_ id: String) async throws { if !demo { try await social("class.leave", ["id": id]) } }
  func deleteClass(_ id: String) async throws { if !demo { try await social("class.delete", ["id": id]) } }
  func updateClass(_ id: String, name: String, school: String) async throws {
    if !demo { try await social("class.update", ["id": id, "patch": ["name": name, "school": school]]) }
  }
  /// The owner makes someone a helper (or a member again); the owner and helpers take someone out.
  func setMember(_ id: String, handle: String, role: String? = nil, remove: Bool = false) async throws {
    if demo { if remove { demoClass.out.insert(handle) } else if let role { demoClass.roles[handle] = role }; return }
    var p: [String: Any] = ["id": id, "handle": handle, "remove": remove]
    if let role { p["role"] = role }
    try await social("class.member", p)
  }
  /// Sharing your progress with the class (off until you say so), and answering the one-time question either way.
  func shareProgress(_ id: String, _ on: Bool) async throws {
    if demo { demoClass.share[id] = on; return }
    try await social("class.share", ["id": id, "on": on])
  }
  func addClassDeck(_ id: String, deckId: String) async throws {
    if demo { demoClass.added.insert(deckId); return }
    try await social("class.addDeck", ["id": id, "deckId": deckId])
  }
  func removeClassDeck(_ id: String, sharedId: String) async throws {
    if demo { demoClass.takenOut.insert(sharedId); return }
    try await social("class.removeDeck", ["id": id, "sharedId": sharedId])
  }
  /// Assigns a class deck: learn every card, or review what's due each day, by a date (YYYY-MM-DD).
  func assign(_ id: String, sharedId: String, goal: String, due: String) async throws {
    if demo {
      let d = ClassSample.shared.CLASSES.values.flatMap(\.deckList).first { $0.deck.id == sharedId }?.deck
      let deck = ClassAssignment.Deck(name: d?.name ?? "", cards: d?.cards ?? 0, url: d?.url ?? "", cover: d?.cover ?? NetCover())
      demoClass.assigned.append((id, ClassAssignment(id: "n\(demoClass.assigned.count)", sharedId: sharedId, goal: goal, due: due, deck: deck)))
      return
    }
    try await social("class.assign", ["id": id, "sharedId": sharedId, "goal": goal, "due": due])
  }
  func unassign(_ id: String, assignment: String) async throws {
    if demo { demoClass.unassigned.insert(assignment); return }
    try await social("class.unassign", ["id": id, "assignment": assignment])
  }
  /// Asks to be verified as a teacher or a school (the admin page decides).
  func askVerify(role: String, school: String, contact: String) async throws {
    if demo { demoClass.verifySent = true; return }
    try await social("verify.ask", ["role": role, "school": school, "contact": contact])
  }
  /// Reports a deck, a person (`handle`), or a suggestion.
  func sendReport(kind: String, id: String, handle: String? = nil, reason: String, note: String) async throws {
    if demo { return }
    var p: [String: Any] = ["kind": kind, "id": id, "reason": reason, "note": note]
    if let handle { p["handle"] = handle }
    try await social("report.send", p)
  }
  /// Studies a class's deck: it joins your library (deck.study); its id there comes back.
  func studySharedDeck(_ sharedId: String) async throws -> String {
    if demo { return "" }
    return try await social("deck.study", ["id": sharedId])["deckId"] as? String ?? ""
  }
  /// A verified teacher checks a deck (deck.check).
  func checkSharedDeck(_ sharedId: String) async throws {
    if !demo { try await social("deck.check", ["id": sharedId]) }
  }
}
