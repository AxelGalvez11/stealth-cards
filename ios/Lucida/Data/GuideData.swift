// A deck's Guide and Sources: what the screens ask the library (web/db.js: `guide`, `sources`, `guideHistory`, the acts `saveGuide`, `addGuidePage`,
// `renameGuidePage`, `deleteGuidePage`, `restoreGuide`, `deleteSource`) and the source viewer's logic (design/materials.mjs DECK_MATERIALS_JS: which part
// of a recording covers a card's time, the parts of what was said with the one a card pointed at marked, what Open the file opens). The Guide editor's own
// memory (what is typed, saving as it is typed) is `GuideEditorModel` (GuideEditor.swift). The Guide's words are read by GuideEngine.swift; the screens are
// Screens/Guide.swift, Screens/DeckMaterials.swift and Design/GuideViews.swift.
import SwiftUI

// ---------- what the screens read ----------
/// A deck's Guide as the screens have it (db.js guide()): its words, when they were saved, its extra pages, whether you can change it, and whether it's
/// a deck you only study (its owner's Guide, read only).
struct GuideVM: Equatable {
  var deckId = "", text = "", at: Double = 0
  var pages: [MakeGuidePage] = []
  var can = false, studying = false
  /// It has words on the Guide, or has pages.
  var hasAny: Bool { !text.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty || !pages.isEmpty }
  /// The Guide itself, or one of its pages, by id ("main" for the Guide).
  func page(_ id: String) -> (id: String, title: String, text: String) {
    if id != "main", let p = pages.first(where: { $0.id == id }) { return (p.id, p.title, p.text) }
    return ("main", "Guide", text)
  }
}

/// A shared deck's Guide for anyone (the deck page's `guide`): the pages with words, and how many sources the deck was made from (a number only: the
/// files and their names stay private).
struct PublicGuide: Decodable, Equatable {
  struct Page: Decodable, Equatable, Identifiable {
    var id = "", title = "", text = ""
    enum CodingKeys: String, CodingKey { case id, title, text }
    init(id: String, title: String, text: String) { self.id = id; self.title = title; self.text = text }
    init(from d: Decoder) throws { let c = try d.container(keyedBy: CodingKeys.self); id = c.v(.id, ""); title = c.v(.title, ""); text = c.v(.text, "") }
  }
  var pages: [Page] = [], sources = 0
  enum CodingKeys: String, CodingKey { case pages, sources }
  init(pages: [Page], sources: Int) { self.pages = pages; self.sources = sources }
  init(from d: Decoder) throws { let c = try d.container(keyedBy: CodingKeys.self); pages = c.v(.pages, []); sources = c.v(.sources, 0) }
}

/// A Source as the Sources list shows it: its name, and a line like "File · 32 pages · 24 cards · Sep 18".
struct SourceVM: Identifiable, Equatable {
  var info: MakeSourceInfo
  var id: String { info.id }
  var name: String { info.name }
  var kind: String { info.kind }
  var line: String { SourceVM.line(info) }
  /// The icon in front of it (the canvas's: a file, pictures, a microphone, YouTube, pasted words, a spark for a topic).
  var icon: String { ["file": "file", "photo": "image", "recording": "mic", "video": "youtube", "text": "paste", "topic": "sparkle"][info.kind] ?? "file" }

  static let kinds = ["file": "File", "photo": "Photos", "recording": "Recording", "video": "YouTube", "text": "Text", "topic": "Topic"]
  static func line(_ s: MakeSourceInfo) -> String {
    let head = (kinds[s.kind] ?? "") + (s.kind == "file" && s.pages > 0 ? " · " + plural(s.pages, "page") : s.kind == "recording" ? (s.seconds > 0 ? " · " + mins(s.seconds) : "") : "")
    return [head, plural(s.cards, "card"), when(s.at)].filter { !$0.isEmpty }.joined(separator: " · ")
  }
  /// "42 min" (at least one), or nothing.
  static func mins(_ secs: Double) -> String { secs > 0 ? "\(max(1, Int((secs / 60).rounded()))) min" : "" }
  /// "Sep 18", as the web writes a day.
  static func when(_ ms: Double) -> String {
    guard ms > 0 else { return "" }
    let f = DateFormatter(); f.locale = Locale(identifier: "en_US_POSIX"); f.setLocalizedDateFormatFromTemplate("MMMd"); f.dateFormat = "MMM d"
    return f.string(from: Date(timeIntervalSince1970: ms / 1000))
  }
}

/// A part of what a source said (the kept text): when ("12:40", or nothing for text before the first time) and the words.
struct SourcePart: Identifiable, Equatable {
  var id: Int
  var at: String, text: String
  /// This is the part a card pointed at (its time matches the card's).
  var hit: Bool
}

/// A source opened (design/materials.mjs `vw`): what it holds and what can be done with it, for the card place `at` ("p. 4", "Slide 3" or "12:40") it was
/// opened at, if any.
struct SourceView: Equatable {
  var source: MakeSourceInfo
  var at: String
  /// The kept words, as read from /media (nil: still coming; "": there are none).
  var raw: String?
  var can: Bool

  var kind: String { source.kind }
  var line: String { SourceVM.line(source) }
  /// How far in a card's time is: "12:40" is 760 seconds, "1:30:00" 5,400; a page ("p. 4") or nothing is 0.
  var secs: Double { SourceView.seconds(at) }
  static func seconds(_ at: String) -> Double {
    guard at.range(of: #"^(?:\d{1,2}:)?\d{1,2}:\d{2}$"#, options: .regularExpression) != nil else { return 0 }
    return at.split(separator: ":").reduce(0.0) { $0 * 60 + (Double($1) ?? 0) }
  }
  /// "p. 4", "page 4" or "Slide 4": the page number (nil for anything else).
  var pageNo: String? {
    let t = at.trimmingCharacters(in: .whitespaces)
    guard let r = t.range(of: #"^(?:p\.?|page|slide)\s*(\d{1,5})$"#, options: [.regularExpression, .caseInsensitive]) else { return nil }
    return t[r].filter(\.isNumber).nilIfEmpty
  }
  /// A recording kept as several files (a long one is cut into parts of at most ten minutes, and the microphone makes a file every ten): the file that
  /// covers the card's time, where it starts in the whole, and its place in the list. Walk the files adding their seconds; the first one is it when the
  /// time is early, the last one when it is past the end (and a file with no length ends the walk).
  var part: (file: SourceFile, offset: Double, index: Int)? {
    guard let first = source.files.first else { return nil }
    guard kind == "recording", source.files.count > 1 else { return (first, 0, 0) }
    var o = 0.0, found = (first, 0.0, 0)
    for (i, f) in source.files.enumerated() {
      found = (f, o, i)
      if f.seconds == 0 || secs < o + f.seconds { break }
      o += f.seconds
    }
    return found
  }
  /// How many seconds into that file the card's time is.
  var secsIn: Double { max(0, secs - (part?.offset ?? 0)) }
  var file: SourceFile? { part?.file }

  var hasAudio: Bool { kind == "recording" && file != nil }
  var photos: [SourceFile] { kind == "photo" ? source.files : [] }
  var topic: String? { kind == "topic" ? source.text : nil }
  /// What was said, in parts, with the one the card pointed at marked: text before the first time, then each "<<time>>" and its words.
  var parts: [SourcePart] {
    guard let raw, !raw.isEmpty else { return [] }
    var out: [SourcePart] = []
    func push(_ a: String, _ text: String) { out.append(SourcePart(id: out.count, at: a, text: text, hit: !at.isEmpty && a == at)) }
    // (split(/\n*<<([^>\n]*)>>\n/): the text, then each time and the text after it)
    let re = try! NSRegularExpression(pattern: "\\n*<<([^>\\n]*)>>\\n")
    let ns = raw as NSString
    var bits: [String] = [], last = 0
    for m in re.matches(in: raw, range: NSRange(location: 0, length: ns.length)) {
      bits.append(ns.substring(with: NSRange(location: last, length: m.range.location - last)))
      bits.append(ns.substring(with: m.range(at: 1)))
      last = m.range.location + m.range.length
    }
    bits.append(ns.substring(from: last))
    let first = bits[0].trimmingCharacters(in: .whitespacesAndNewlines)
    if !first.isEmpty { push("", first) }
    var i = 1
    while i < bits.count {
      let words = (i + 1 < bits.count ? bits[i + 1] : "").trimmingCharacters(in: .whitespacesAndNewlines)
      if !words.isEmpty { push(bits[i], words) }
      i += 2
    }
    return out
  }
  var loading: Bool { !source.textName.isEmpty && raw == nil }
  /// A line where there is nothing to show (a file's pages, or that nothing was kept).
  var noText: Bool { (parts.isEmpty && !source.textName.isEmpty && raw == "") || kind == "file" }
  var noTextLine: String { kind == "file" ? (source.pages > 0 ? plural(source.pages, "page") + ". " : "") + "The cards from it say which page they came from." : "Nothing to show." }
  var hasOpen: Bool { kind == "video" ? !source.url.isEmpty : (kind == "file" || kind == "recording") && file != nil }
  var openLabel: String { kind == "video" ? "Open the video" : kind == "recording" ? "Open the recording" : "Open the file" }
  /// A video's own address at the card's time ("&t=90s"), the web's way.
  var videoURL: URL? {
    guard kind == "video", !source.url.isEmpty else { return nil }
    return URL(string: source.url + (secs > 0 ? (source.url.contains("?") ? "&" : "?") + "t=\(Int(secs))s" : ""))
  }
}

// ---------- what the Store gives ----------
extension Store {
  /// The state the design screens show a deck's Guide and Sources in (the canvas's `guide` setting).
  var guideState: String { props.guideState }

  /// A deck's Guide (and whether it can be changed): the library's, or on a design screen the canvas's sample.
  func guide(_ deckId: String) -> GuideVM {
    if demo { return props.emptyDeck ? GuideVM(deckId: deckId, can: true) : GuideSample.guide(props.guideState) }
    let g = lib.materials[deckId]?.guide ?? MakeGuide()
    let ro = deck(deckId).sharing.readOnly
    return GuideVM(deckId: deckId, text: g.text, at: g.at, pages: g.pages, can: !ro, studying: ro)
  }
  /// A deck's Sources, newest first (the web reverses the list it keeps).
  func sources(_ deckId: String) -> [SourceVM] {
    (demo ? (props.emptyDeck ? [] : GuideSample.sources(props.guideState)) : (lib.materials[deckId]?.sources ?? []).reversed()).map(SourceVM.init)
  }
  func source(_ deckId: String, _ id: String) -> MakeSourceInfo? { sources(deckId).first { $0.id == id }?.info }

  // ---------- the acts ----------
  /// A change to a Guide or a Source: the library comes back with it. Unlike most acts, a failure is thrown, not shown in an alert (the editor says what
  /// went wrong in its own line, like the web's quiet saves).
  @discardableResult
  func guideAct(_ type: String, _ payload: [String: Any]) async throws -> [String: Any] {
    guard !demo else { return [:] }
    do { let r = try await api.action(type, payload); accept(r.state); return r.result }
    catch APIError.signedOut { phase = .signedOut; throw APIError.signedOut }
    catch let e as APIError { throw e }
    catch { throw APIError.server("Couldn’t reach Lucida. Check your connection and try again.") }
  }
  func guideSave(_ deckId: String, page: String, text: String) async throws { try await guideAct("guide.save", ["deckId": deckId, "page": page, "text": text]) }
  func guideAddPage(_ deckId: String, title: String) async throws -> String { try await guideAct("guide.page.add", ["deckId": deckId, "title": title])["id"] as? String ?? "" }
  func guideRenamePage(_ deckId: String, page: String, title: String) async throws { try await guideAct("guide.page.rename", ["deckId": deckId, "page": page, "title": title]) }
  func guideDeletePage(_ deckId: String, page: String) async throws { try await guideAct("guide.page.delete", ["deckId": deckId, "page": page]) }
  func guideRestore(_ deckId: String, page: String, at: Double) async throws { try await guideAct("guide.restore", ["deckId": deckId, "page": page, "at": at]) }
  func sourceDelete(_ deckId: String, id: String) async throws { try await guideAct("source.delete", ["deckId": deckId, "id": id]) }

  /// A page's older versions, newest first (none when they can't be had).
  func guideHistory(_ deckId: String, page: String) async -> [GuideVersion] {
    if demo { return GuideSample.versions }
    var c = URLComponents(); c.path = "api/guide/history"; c.queryItems = [URLQueryItem(name: "deck", value: deckId), URLQueryItem(name: "page", value: page)]
    guard let path = c.string, let r = try? await api.get(path), (200..<300).contains(r.status) else { return [] }
    struct Reply: Decodable { var versions: [GuideVersion] = [] }
    return (try? JSONDecoder().decode(Reply.self, from: r.data))?.versions ?? []
  }

  // ---------- what a source kept ----------
  /// A source's kept words (what a recording or a video said), once asked for; nil while it's coming, "" when there are none.
  func sourceText(_ name: String) -> String? {
    if demo { return GuideSample.sourceText(name) }
    if name.isEmpty { return "" }
    return sourceTexts.texts[name]
  }
  /// Asks for a source's kept words (the answer shows when it comes).
  func loadSourceText(_ name: String) async {
    guard !demo, !name.isEmpty, sourceTexts.texts[name] == nil, !sourceTexts.asked.contains(name) else { return }
    sourceTexts.asked.insert(name)
    let r = try? await api.get("media/" + (name.addingPercentEncoding(withAllowedCharacters: .urlPathAllowed) ?? name))
    sourceTexts.texts[name] = r.flatMap { (200..<300).contains($0.status) ? String(data: $0.data, encoding: .utf8) : nil } ?? ""
  }
  /// The view of a source opened (at a card's place, if one sent you here), or nil when it's gone.
  func sourceView(_ deckId: String, _ id: String, at: String) -> SourceView? {
    guard let s = source(deckId, id) else { return nil }
    return SourceView(source: s, at: at, raw: sourceText(s.textName), can: guide(deckId).can)
  }
}

/// The kept words of the sources already asked for, by file name (a name that is asked for but not here yet is on its way). Published on its own so the
/// viewer redraws when one arrives.
@MainActor
final class SourceTexts: ObservableObject {
  @Published var texts: [String: String] = [:]
  var asked = Set<String>()
}
