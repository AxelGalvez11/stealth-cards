// Making cards from anything (web/make.js, ported; the server side is web/make.mjs). A person picks a source (a file, pictures, a
// recording, pasted text, a YouTube link, or a topic in words), a few options, watches it work, checks the new cards, and saves them
// into a deck. This file is the flow's memory and what it does, and the client for /api/make/*; the screens (Screens/Make.swift, drawn
// like the canvas's PhoneMake board) only draw `MakeFlow.m`. It does exactly the calls web/make.js does, in the same order:
//
//   pick -> add (the source, and the options under it) -> making -> review -> (saved: off to the deck)
//                                                             \-> error (plain words, and a way to go on)
//
// Making is a few requests, so a big source never meets a time limit: the files go up (small ones through this server, big ones straight to
// storage: `put.url` is a path on this server, sent with the session cookie, or an https address of the storage, sent with the headers it
// gives and no cookie), `start` reads them, `step` runs once for each part (three at a time, a failed one tried again twice), `finish`
// joins the cards, and `save` puts the kept ones in the deck. Nothing here draws anything (it builds for the Mac too, for ios/tests/make-check.sh).
import Foundation
import Combine
import UniformTypeIdentifiers

/// A deck as the options offer it: its name, and whether it's one you only study (its owner's cards, which can't take new ones).
struct MakeDeckRef: Equatable { var id: String, name: String, readOnly = false }

// ---------- how the flow opens ----------
/// Where the flow starts (the web's /make?source=&deck=&from=&guide=&page=): `kind` (file, photo, record, paste, video, topic, or none),
/// the deck the cards go to, a kept source to make more cards from (`from`, its id), and a deck's Guide (`guide`, the deck's id, and its
/// `page`, "" or "main" for the Guide itself) to make cards from. `text` (and its `title`) start it on Paste with words already in hand.
struct MakeStart: Hashable {
  var kind = "", deckId = "", from = "", guide = "", page = ""
  var text = "", title = ""
  /// Debug builds: what the -makeFile, -makePhoto, -makeRecording, -makeTopic, -makeText and -makeVideo launch arguments hand the flow, as if
  /// it was picked or recorded (the simulator has no microphone); `speed` makes the stand-in microphone's clock run that many times faster.
  var files: [String] = [], recording = "", topic = "", url = "", speed = 1.0
  /// A design screen: which of the canvas's states to show (MakeSample).
  var demo = ""
  var isDemo: Bool { !demo.isEmpty }
}

// ---------- the flow's pieces ----------
struct MakeError: Error {
  var message: String
  var status = 0, code = ""
  var pro = false, network = false, signedOut = false
}

/// A file to make cards from, kept in a folder of this app's own until it's sent.
struct MakeFile: Identifiable, Equatable {
  enum Family: String { case doc, image, audio }
  let id = UUID()
  var name: String, type: String, size: Int, fam: Family, url: URL
  /// A recording's length in seconds (what the app timed; the server reads it from the file when it can).
  var seconds: Double = 0
  /// A recording picked from Files that was cut into parts of at most ten minutes (MakeSplit): these go up one after another in its place
  /// (`url` is then the whole file it came from, and `size` is what goes up: the parts' sizes added).
  var parts: [MakePart] = []
  /// What goes up, as files of their own: the file itself, or each of its parts ("Lecture (part 3 of 12).m4a").
  var uploads: [MakeFile] {
    guard !parts.isEmpty else { return [self] }
    let base = (name as NSString).deletingPathExtension
    return parts.enumerated().map { i, p in
      MakeFile(name: "\(base) (part \(i + 1) of \(parts.count)).m4a", type: "audio/mp4", size: p.size, fam: .audio, url: p.url, seconds: p.seconds)
    }
  }
}
/// Something picked or recorded, before it's checked and made small.
struct PickedFile { var url: URL; var name: String; var type = "" }

struct MakeCard: Identifiable, Equatable {
  var key: String, kind: String, front: String, back: String, text: String, at: String
  /// An audio card: the words a voice reads aloud (`speak`) and their language (`lang`, BCP 47 like es-ES); `back` says what they mean.
  var speak = "", lang = ""
  var gone = false
  /// An image card (picture cards from the diagrams found in the material): `front` is the diagram's name; `pic` says which diagram of the make or the deck it is (sent back on
  /// saving), `image` is where to see it (before anything is kept), `parts` the words hidden in it and `boxes` where each is (fractions of the picture). All the boxes of a picture
  /// are checked, kept or left out together.
  var pic = "", image = ""
  var parts: [String] = []
  var boxes: [OccBox] = []
  var id: String { key }
}
/// One note of the draft: a heading, where in the material it comes from ("p. 4", "12:40"; or nothing), and its words as Markdown.
struct MakeNote: Equatable { var heading = "", at = "", text = "" }
/// The starter notes drafted from the same material as the cards (web/make.mjs draftNotes): a title, an overview, a note for each part of the
/// material in order, and the whole draft as Markdown (`text`). The review shows them above the cards, and saving keeps them with the cards
/// unless the switch is off.
struct MakeNotes: Equatable {
  var title = "", overview = "", text = ""
  var sections: [MakeNote] = []
  /// What the notes' line says ("6 notes · p. 4 to p. 9 · saved with the cards").
  func line(keep: Bool) -> String {
    let ats = sections.map(\.at).filter { !$0.isEmpty }
    return plural(sections.count, "note") + (ats.count > 1 ? " · \(ats[0]) to \(ats[ats.count - 1])" : ats.count == 1 ? " · \(ats[0])" : "") + (keep ? " · saved with the cards" : " · not saved")
  }
  /// What /api/make/finish answers under `notes` (null when there are none).
  init?(_ j: Any?) {
    guard let j = j as? [String: Any] else { return nil }
    title = j["title"] as? String ?? ""; overview = j["overview"] as? String ?? ""; text = j["text"] as? String ?? ""
    sections = (j["sections"] as? [[String: Any]] ?? []).map { MakeNote(heading: $0["heading"] as? String ?? "", at: $0["at"] as? String ?? "", text: $0["text"] as? String ?? "") }
  }
  init(title: String, overview: String, sections: [MakeNote], text: String) { self.title = title; self.overview = overview; self.sections = sections; self.text = text }
}
struct MakeProgress: Equatable { var word = "", phase = "", i = 0, n = 1 }
/// What went wrong, or what to say: `soft` is a line under what's being done (the person fixes it and goes on); otherwise the problem
/// is the page. `pro`: Pro would help (Go Pro). `again`: the make can go on from where it stopped (Try again).
struct MakeErr: Equatable {
  var message: String
  var soft = false, pro = false, code = "", network = false, again = false
}
struct MakeOpts: Equatable {
  /// 0 is Auto; or 10, 20, 50.
  var count = 0
  var basic = true, cloze = true
  /// Audio cards (words read aloud, for learning the language that is set): offered only with a language, and off until turned on.
  var audio = false
  /// Image cards: a card for each label of the diagrams found in the material, with the label hidden. Offered where there may be some (MakeFlow.canImage); off until turned on.
  var image = false
  var lang = "", deckId = "", deckName = ""
}
struct MakeFrom: Equatable { var deckId: String, id: String, name: String, kind: String }

struct MakeState {
  var key = ""
  var step = "pick"
  var kind = ""
  var files: [MakeFile] = []
  var text = "", topic = "", url = ""
  var transcript = false
  var title = ""
  var opts = MakeOpts()
  var job = ""
  var progress = MakeProgress()
  var cards: [MakeCard] = []
  /// How many diagrams the make found in the material (they are kept in the deck's Diagrams once the cards are saved).
  var figures = 0
  var editing = ""
  var error: MakeErr?
  var from: MakeFrom?
  var saving = false
  var seconds: [Double] = []
  var name = ""
  /// The recording stopped by itself at the plan's limit: said again on the pages after it.
  var limitNote = ""
  /// The microphone's state (the recorder tells the flow, so the page's Back, X and buttons follow it).
  var rec = MakeRecorder.State.idle
  /// What's being done before it can go on, in a line under the box (a long recording being cut into parts); empty when nothing is.
  var note = ""
  /// The starter notes drafted beside the cards (nil when there are none), whether they are kept with the cards (the switch), and whether the draft
  /// is unfolded to read. `noNotes`: none are asked for (a make from a Guide page, which already is notes).
  var notes: MakeNotes?
  var keepNotes = true, notesOpen = false, noNotes = false
  /// For a design screen only (there is no library to ask there): the deck the cards go into has every page a Guide may have, so the notes have no room.
  var guideFull = false
}

// ---------- the client for /api/make/* ----------
final class MakeAPI {
  /// Every request of the flow, the way web/make.js `call` makes them: the server's words and `code` and `pro` are kept, a 401 is signed out.
  /// The cookies are the app's own (HTTPCookieStorage.shared, like API); the storage's direct upload has none.
  private let session: URLSession, bare: URLSession
  private let base: () -> URL
  init(base: @escaping () -> URL = { API.base }) {
    self.base = base
    let c = URLSessionConfiguration.default
    c.httpCookieStorage = .shared; c.httpShouldSetCookies = true; c.httpCookieAcceptPolicy = .always
    c.requestCachePolicy = .reloadIgnoringLocalCacheData
    session = URLSession(configuration: c)
    // An address of the storage's own gets no cookie of ours, whoever we are signed in as.
    let b = URLSessionConfiguration.ephemeral
    b.httpCookieStorage = nil; b.httpShouldSetCookies = false; b.httpCookieAcceptPolicy = .never
    b.requestCachePolicy = .reloadIgnoringLocalCacheData
    bare = URLSession(configuration: b)
  }

  static let unreachable = "Couldn’t reach Lucida. Check your connection and try again."
  static let generic = "Something went wrong. Try again."
  private func url(_ path: String) -> URL { URL(string: path, relativeTo: base())!.absoluteURL }

  func call(_ path: String, _ body: [String: Any]? = nil, method: String = "POST", timeout: TimeInterval = 90) async throws -> [String: Any] {
    var r = URLRequest(url: url(path))
    r.httpMethod = method; r.timeoutInterval = timeout
    r.setValue("application/json", forHTTPHeaderField: "content-type"); r.setValue("application/json", forHTTPHeaderField: "accept")
    if method != "GET" { r.httpBody = try JSONSerialization.data(withJSONObject: body ?? [:]) }
    let data: Data, resp: URLResponse
    do { (data, resp) = try await session.data(for: r) }
    catch { throw MakeAPI.lost(error, MakeAPI.unreachable) }
    let http = resp as? HTTPURLResponse
    if http?.statusCode == 401 { throw MakeError(message: "Signed out", status: 401, signedOut: true) }
    let j = (try? JSONSerialization.jsonObject(with: data)) as? [String: Any] ?? [:]
    guard let status = http?.statusCode, (200..<300).contains(status) else {
      throw MakeError(message: (j["error"] as? String).flatMap { $0.isEmpty ? nil : $0 } ?? MakeAPI.generic, status: http?.statusCode ?? 0,
                      code: j["code"] as? String ?? "", pro: j["pro"] as? Bool ?? false)
    }
    return j
  }
  /// A request that never got an answer: stopped on purpose (the person's Cancel), or the network.
  private static func lost(_ e: Error, _ words: String) -> Error {
    if e is CancellationError || (e as? URLError)?.code == .cancelled || Task.isCancelled { return CancellationError() }
    return MakeError(message: words, network: true)
  }

  /// One file goes up: where to put it is asked for first, then the bytes go there (this server's own /api/make/put/<id>, with the person's
  /// cookie, or the storage's address with the headers it gave and no cookie). Returns the upload's id.
  func sendFile(_ f: MakeFile) async throws -> String {
    let r = try await call("api/make/upload", ["name": f.name, "type": f.type, "size": f.size])
    guard let id = r["id"] as? String, let put = r["put"] as? [String: Any], let to = put["url"] as? String else { throw MakeError(message: MakeAPI.generic) }
    let direct = !to.hasPrefix("/")
    var req = URLRequest(url: direct ? (URL(string: to) ?? url("/")) : url(to))
    req.httpMethod = "PUT"; req.timeoutInterval = 300
    for (k, v) in put["headers"] as? [String: Any] ?? [:] { if let v = v as? String { req.setValue(v, forHTTPHeaderField: k) } }
    let status: Int
    do { status = (try await (direct ? bare : session).upload(for: req, fromFile: f.url).1 as? HTTPURLResponse)?.statusCode ?? 0 }
    catch { throw MakeAPI.lost(error, "Couldn’t send your file. Check your connection and try again.") }
    if status == 401 { throw MakeError(message: "Signed out", status: 401, signedOut: true) }
    guard (200..<300).contains(status) else { throw MakeError(message: status == 413 ? "That file is too big to send." : "Couldn’t send your file. Try again.", status: status) }
    return id
  }
}

// ---------- the flow ----------
/// The next part to run and how many are done, shared by the (up to three) workers on the main actor.
@MainActor private final class StepCount { var next = 0, done = 0 }

/// What the flow asks of the app around it.
struct MakeEnv {
  var info: () -> MakeInfo = { MakeInfo() }
  var decks: () -> [MakeDeckRef] = { [] }
  var materials: (String) -> DeckMaterials? = { _ in nil }
  /// Brings the library up to date (after a save).
  var reload: () async -> Void = {}
  var signedOut: () -> Void = {}
  /// The flow is over: the deck to open (after a save), or nil to just go back to the page it came from.
  var leave: (String?) -> Void = { _ in }
  /// A design screen: nothing is sent anywhere.
  var demo = false
}

@MainActor
final class MakeFlow: ObservableObject {
  @Published var m = MakeState()
  var env: MakeEnv
  let api: MakeAPI
  /// The microphone (or, in a debug build with -makeRecording, a file standing in for it).
  let recorder = MakeRecorder()
  private var run = 0
  private var task: Task<Void, Never>?
  private var cleanup: [URL] = []
  /// Counts the times what was picked stopped mattering (Back, the X, a new page), so a slow pick (a long recording being cut) that finishes
  /// afterwards adds nothing.
  private var pickToken = 0
  /// A recording being cut into parts: how many are (for the line under the box, which only says so while one is), and the way to stop it.
  private var cutBusy = 0
  private var cutStop: MakeStop?
  private var bag = Set<AnyCancellable>()

  init(env: MakeEnv = MakeEnv(), api: MakeAPI = MakeAPI()) {
    self.env = env; self.api = api
    recorder.$state.receive(on: DispatchQueue.main).sink { [weak self] s in self?.m.rec = s }.store(in: &bag)
  }
  deinit { cutStop?.stop(); for u in cleanup { try? FileManager.default.removeItem(at: u) } }

  // ---------- small helpers ----------
  static func mb(_ n: Int) -> String { n >= 1_000_000 ? String(format: n >= 10_000_000 ? "%.0f MB" : "%.1f MB", Double(n) / 1e6) : "\(max(1, Int((Double(n) / 1000).rounded()))) KB" }
  /// What a file's row says about its size: "3.2 MB", or "57 MB · 12 parts" for a recording that is cut into parts before it goes.
  static func sizeLine(_ f: MakeFile) -> String { mb(f.size) + (f.parts.count > 1 ? " · " + plural(f.parts.count, "part") : "") }
  // (Caption files, .srt and .vtt, are documents too: the server reads their lines and times with no AI.)
  static let DOC: Set<String> = ["pdf", "pptx", "docx", "txt", "md", "srt", "vtt"]
  static let IMG: Set<String> = ["png", "jpg", "jpeg", "gif", "webp", "heic", "heif"]
  static let AUD: Set<String> = ["mp3", "m4a", "mp4", "wav", "ogg", "oga", "opus", "webm", "aac", "flac"]
  /// What to call a kind of file when the system has no name for it (caption files, mostly).
  static let MIME = ["srt": "application/x-subrip", "vtt": "text/vtt", "md": "text/plain"]
  static func mime(_ ext: String) -> String { UTType(filenameExtension: ext)?.preferredMIMEType ?? MIME[ext.lowercased()] ?? "" }
  static let tooLong = "That recording is too long to send in one piece, and Lucida couldn’t cut it into parts. Try a shorter one."
  /// What the server says (web/make.mjs) when a recording is longer than the plan makes from: said at once, before it goes up.
  static func longRecording(_ secs: Double, _ lim: MakeInfo) -> String {
    "That recording is \(plural(Int((secs / 60).rounded()), "minute")) long. "
      + (lim.minutes < MakeInfo.pro.minutes ? "Free makes from up to \(lim.minutes) minutes at a time. Go Pro for up to \(MakeInfo.pro.minutes)." : "Pro makes from up to \(lim.minutes) minutes at a time.")
  }
  static let words = ["file": "Reading your file…", "photo": "Reading your pictures…", "record": "Listening to your recording…", "paste": "Reading your text…", "video": "Watching the video…", "topic": "Thinking about your topic…"]
  private var info: MakeInfo { env.info() }
  private func bump() { objectWillChange.send() }
  static func family(_ name: String, _ type: String) -> MakeFile.Family? {
    let e = (name as NSString).pathExtension.lowercased(), t = type.lowercased()
    return DOC.contains(e) ? .doc : IMG.contains(e) || t.hasPrefix("image/") ? .image : AUD.contains(e) || t.hasPrefix("audio/") ? .audio : nil
  }
  /// A place of this app's own for a file to wait in until it's sent (it goes with the flow).
  func scratch(_ name: String) -> URL { scratchDir().appendingPathComponent(name) }
  /// A folder of this app's own that goes with the flow (what's in it is deleted when the flow ends).
  func scratchDir() -> URL {
    let dir = FileManager.default.temporaryDirectory.appendingPathComponent("lucida-make-" + UUID().uuidString, isDirectory: true)
    try? FileManager.default.createDirectory(at: dir, withIntermediateDirectories: true)
    cleanup.append(dir)
    return dir
  }
  /// Throws away the parts a recording was cut into (their folder), now that nothing will send them.
  private func dropParts(_ files: [MakeFile]) {
    for f in files { if let p = f.parts.first { try? FileManager.default.removeItem(at: p.url.deletingLastPathComponent()) } }
  }

  // ---------- starting ----------
  /// Opens the flow where `s` says (see MakeStart): a kind's page, more cards from a kept source, or a Guide page's words.
  func enter(_ s: MakeStart) {
    pickToken += 1; cutStop?.stop(); dropParts(m.files)
    m = MakeState()
    m.key = [s.kind, s.deckId, s.from, s.guide, s.page].joined(separator: "|")
    if !s.deckId.isEmpty { m.opts.deckId = s.deckId }
    if !s.from.isEmpty && !s.deckId.isEmpty {
      if let src = env.materials(s.deckId)?.sources.first(where: { $0.id == s.from }) {
        m.from = MakeFrom(deckId: s.deckId, id: src.id, name: src.name, kind: src.kind)
        m.kind = ["photo": "photo", "recording": "record", "video": "video", "text": "paste", "topic": "topic"][src.kind] ?? "file"
        m.step = "add"
      }
    } else if !s.guide.isEmpty {
      let d = env.decks().first(where: { $0.id == s.guide }), g = env.materials(s.guide)?.guide ?? MakeGuide()
      let p = !s.page.isEmpty && s.page != "main" ? g.pages.first(where: { $0.id == s.page }) : nil
      let text = p?.text ?? g.text
      if let d, !text.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty {
        m.kind = "paste"; m.text = text; m.title = d.name + (p.map { ": " + $0.title } ?? " Guide"); m.step = "add"; m.opts.deckId = d.id
        m.noNotes = true   // (a Guide page already is notes)
      }
    } else if !s.text.isEmpty && (s.kind.isEmpty || s.kind == "paste") {
      m.kind = "paste"; m.text = s.text; m.title = s.title; m.step = "add"
      m.noNotes = true   // (words in hand come from a Guide's selection: notes for them would be notes on notes)
    } else if ["file", "photo", "record", "paste", "video", "topic"].contains(s.kind) {
      m.kind = s.kind; m.step = "add"
    }
  }
  func choose(_ kind: String) { pickToken += 1; cutStop?.stop(); m.kind = kind; m.step = "add"; m.error = nil; m.note = "" }
  func back() {
    if m.step == "add" && m.from == nil { pickToken += 1; cutStop?.stop(); dropParts(m.files); m.step = "pick"; m.kind = ""; m.files = []; m.error = nil; m.note = "" }
    else if m.step == "error" { m.step = m.job.isEmpty ? "add" : "making" }
  }
  /// The X: nothing happens while it's making or recording; anywhere else the flow ends (what was made stays on the server, and goes after
  /// six hours).
  func close() {
    if m.step == "making" || recorder.live { return }
    pickToken += 1; cutStop?.stop()
    recorder.discard()
    env.leave(nil)
  }

  // ---------- adding things to make cards from ----------
  /// Checks what was picked (one kind at a time, a size, a picture count), makes pictures smaller (at most 1600 pixels across, as a JPEG:
  /// the phone's camera gives HEIC, which the server can't read), cuts a long recording into parts, and adds what's fine. What isn't fine is
  /// said in one line under the box.
  ///
  /// A recording picked from Files that is over 18 MB or longer than ten minutes is cut into even parts of at most ten minutes (MakeSplit), each of
  /// which goes up as a file of its own, in order, in the same make; its row stays one row ("57 MB · 12 parts"). The recorder's own files are
  /// ten minutes each already and don't come through here. A recording that can't be cut and is over the server's 25 MB says so.
  func addFiles(_ list: [PickedFile]) async {
    let lim = info, token = pickToken
    var tip: [String] = []
    for f in list {
      let have = m.files
      guard let fam = MakeFlow.family(f.name, f.type) else { tip.append("Lucida can’t read that kind of file. Try a PDF, slides, a Word file, pictures, or a recording."); continue }
      if let first = have.first, first.fam != fam || fam == .doc {
        tip.append(fam == .doc || first.fam == .doc ? "Pick one document at a time." : "Pick one kind of file at a time: pictures, or a recording, or one document."); continue
      }
      var file = f
      if fam == .image {
        let base = (f.name as NSString).deletingPathExtension
        if let small = await MakeFlow.shrink(f, into: scratch((base.isEmpty ? "photo" : base) + ".jpg")) { file = small }
        else if (f.name as NSString).pathExtension.lowercased().hasPrefix("hei") { tip.append("That photo is in a format Lucida can’t read (HEIC). Pick a JPEG or PNG picture."); continue }
        guard token == pickToken else { return }
      }
      let size = (try? FileManager.default.attributesOfItem(atPath: file.url.path)[.size] as? Int) ?? 0
      var parts: [MakePart] = []
      if fam == .audio && size > 0 {
        let secs = await MakeSplit.duration(of: file.url)
        guard token == pickToken else { return }
        // Longer than the plan makes from: said now, as the server would after the whole recording had gone up.
        if let secs, secs > Double(lim.minutes) * 60 * 1.03 { tip.append(MakeFlow.longRecording(secs, lim)); continue }
        if let secs, MakeSplit.needsCutting(size: size, seconds: secs) {
          let folder = scratchDir(), stop = MakeStop()
          cutStop = stop; cutBusy += 1
          let cut = await MakeSplit.cut(file.url, size: size, seconds: secs, into: folder, stop: stop) { [weak self] done, n in Task { @MainActor in self?.cutting(done, of: n, token) } }
          cutBusy -= 1
          guard token == pickToken else { try? FileManager.default.removeItem(at: folder); return }
          m.note = ""
          if let cut { parts = cut }
          else { try? FileManager.default.removeItem(at: folder); if size > lim.audioMB * 1_000_000 { tip.append(MakeFlow.tooLong); continue } }
        } else if secs == nil && size > lim.audioMB * 1_000_000 { tip.append(MakeFlow.tooLong); continue }   // (not a sound AVFoundation can read, and too big to send as it is)
      }
      let limit = (fam == .audio ? lim.audioMB : lim.fileMB) * 1_000_000
      if parts.isEmpty && size > limit { tip.append("That file is over \(fam == .audio ? lim.audioMB : lim.fileMB) MB." + (fam != .audio && lim.fileMB < 40 ? " Go Pro for up to 40 MB." : "")); continue }
      if size < 1 { tip.append("That file is empty."); continue }
      if fam == .image && have.count >= lim.photos { tip.append("That’s the most pictures for one make (\(lim.photos))."); continue }
      let guess = MakeFlow.mime((file.name as NSString).pathExtension)
      let type = !file.type.isEmpty ? file.type : guess.isEmpty ? "application/octet-stream" : guess
      m.files.append(MakeFile(name: file.name.isEmpty ? "File" : file.name, type: type, size: parts.isEmpty ? size : parts.reduce(0) { $0 + $1.size }, fam: fam, url: file.url, parts: parts))
    }
    m.error = tip.isEmpty ? nil : MakeErr(message: tip[0], soft: true)
  }
  /// The line under the box while a long recording is being cut into parts.
  private func cutting(_ done: Int, of n: Int, _ token: Int) {
    guard token == pickToken, cutBusy > 0 else { return }
    m.note = done == 0 ? "Getting your recording ready…" : "Getting your recording ready… \(done) of \(n)"
  }
  /// A picture as a smaller JPEG (at most 1600 pixels on a side, upright, with no photo metadata) written to `to`; nil when it can't be read.
  nonisolated static func shrink(_ f: PickedFile, into to: URL) async -> PickedFile? {
    await Task.detached(priority: .userInitiated) { () -> PickedFile? in
      guard let data = try? Data(contentsOf: f.url), let jpg = Upload.jpeg(data, side: 1600), (try? jpg.write(to: to)) != nil else { return nil }
      return PickedFile(url: to, name: to.lastPathComponent, type: "image/jpeg")
    }.value
  }
  func removeFile(_ id: UUID) {
    guard m.note.isEmpty else { return }
    dropParts(m.files.filter { $0.id == id })
    m.files.removeAll { $0.id == id }; m.error = nil
  }
  func setText(_ v: String) { m.text = v; m.error = nil }
  func setTopic(_ v: String) { m.topic = v; m.error = nil }
  func setUrl(_ v: String) { m.url = v.trimmingCharacters(in: .whitespacesAndNewlines); m.error = nil }
  func useTranscript(_ on: Bool) { m.transcript = on; m.error = nil }
  /// Where the video's words come from: the transcript (when the person chose to paste it, or this server can't watch videos), else the link.
  var usesTranscript: Bool { m.transcript || (!info.video && !env.demo) }
  /// Picture cards (the Image kind) are offered for a PDF, slides, a Word file or pictures, which may have diagrams, and for more cards from a source that already has diagrams
  /// with labels. It starts off.
  var canImage: Bool {
    if let f = m.from { return env.materials(f.deckId)?.diagrams.contains { $0.src?.id == f.id && !($0.labels ?? []).isEmpty } ?? false }
    if m.kind == "photo" { return !m.files.isEmpty }
    return m.kind == "file" && m.files.contains { $0.fam == .image || ["pdf", "pptx", "docx"].contains(($0.name as NSString).pathExtension.lowercased()) }
  }
  /// Changes an option (web/make.js setOpt). At least one kind of card always stays on; Audio counts only while a language is set (clearing the
  /// language turns it off, and gives Basic and Fill in the blank back if Audio was the only kind left on).
  func setOpt(_ f: (inout MakeOpts) -> Void) {
    let was = m.opts
    var o = was; f(&o)
    if o.lang.isEmpty && !was.lang.isEmpty { o.audio = false }
    if !o.basic && !o.cloze && !(o.audio && !o.lang.isEmpty) && !(o.image && canImage) {
      guard o.lang != was.lang else { return }
      o.basic = true; o.cloze = true
    }
    m.opts = o
  }
  /// The switch: whether the notes are saved with the cards. It does nothing when the deck has no room for them.
  func setKeepNotes(_ on: Bool) { guard !notesFull else { return }; m.keepNotes = on }
  func toggleNotesOpen() { m.notesOpen.toggle() }
  /// What the notes panel says when the deck the cards go into already has every page its Guide may have.
  static let noRoomForNotes = "This deck has every page a Guide can have, so these notes can’t be added. Delete a page in its Guide to make room."
  /// There are notes, and the deck they would go into (not a new one, which has no Guide) already has the Guide's words or pages, and as many pages as a Guide may have
  /// (the library's `make.guidePages`): the notes can't be added, the panel says so, its switch is off and out of reach, and saving sends `notes: false`. Asked of the library
  /// each time, so a page deleted meanwhile gives the room back.
  var notesFull: Bool {
    guard m.notes != nil else { return false }
    if env.demo { return m.guideFull }
    guard !m.opts.deckId.isEmpty, let g = env.materials(m.opts.deckId)?.guide else { return false }
    let has = !g.pages.isEmpty || !g.text.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty
    return has && g.pages.count >= env.info().guidePages
  }

  // ---------- recording a lecture ----------
  /// Starts the microphone. A file is made for every ten minutes, Stop makes the cards, and at the plan's limit it stops by itself.
  func recStart() {
    guard !recorder.live else { return }
    recorder.limit = Double(info.minutes) * 60
    recorder.onLimit = { [weak self] in
      guard let self else { return }
      let n = self.info.minutes
      self.m.limitNote = "That’s the \(plural(n, "minute")) limit for one make."
      Task { await self.recStop() }
    }
    m.error = nil; m.limitNote = ""
    Task {
      if let problem = await recorder.start() { m.error = MakeErr(message: problem, soft: true) }
      bump()
    }
  }
  func recPause() { recorder.pause() }
  func recResume() { recorder.resume() }
  func recStop() async {
    let got = await recorder.stop()
    guard !got.isEmpty else { bump(); return }
    let when = MakeFlow.when(Date())
    m.files = got.enumerated().map { i, s in
      let ext = s.url.pathExtension.isEmpty ? "m4a" : s.url.pathExtension
      return MakeFile(name: "Recording \(i + 1)." + ext, type: UTType(filenameExtension: ext)?.preferredMIMEType ?? "audio/mp4",
                      size: (try? FileManager.default.attributesOfItem(atPath: s.url.path)[.size] as? Int) ?? 0, fam: .audio, url: s.url, seconds: s.seconds)
    }
    cleanup.append(contentsOf: Set(got.map { $0.url.deletingLastPathComponent() }))
    m.title = m.title.isEmpty ? "Lecture · " + when : m.title
    m.seconds = got.map(\.seconds)
    make()
  }
  func recDiscard() { recorder.discard(); m.limitNote = "" }
  static func when(_ d: Date) -> String {
    let f = DateFormatter(); f.locale = Locale(identifier: "en_US"); f.dateFormat = "MMM d, h:mm a"
    return f.string(from: d)
  }

  // ---------- making ----------
  func sourceBody() -> [String: Any] {
    let o = m.opts
    // (Audio cards are for learning a language, so they only go along when one is set. Notes are asked for with the cards, which is the only way the server drafts them,
    // except from a Guide page, which already is notes: those say `notes: false`. More cards from a source say nothing: its notes were drafted when it was made.)
    var options: [String: Any] = ["count": o.count == 0 ? "auto" : o.count, "kinds": [o.basic ? "basic" : nil, o.cloze ? "cloze" : nil, o.audio && !o.lang.isEmpty ? "audio" : nil, o.image && canImage ? "image" : nil].compactMap { $0 },
                                  "lang": o.lang, "deckId": o.deckId, "deckName": o.deckName]
    if m.from == nil { options["notes"] = !m.noNotes }
    if let f = m.from { return ["fromSource": ["deckId": f.deckId, "id": f.id], "options": options] }
    switch m.kind {
    case "topic": return ["kind": "topic", "topic": m.topic, "options": options]
    case "video":
      var b: [String: Any] = ["kind": "video", "url": m.url, "options": options]
      if usesTranscript { b["text"] = m.text }
      if !m.title.isEmpty { b["title"] = m.title }
      return b
    case "paste": return ["kind": "text", "text": m.text, "title": m.title, "options": options]
    default: return ["kind": m.kind == "record" ? "recording" : m.kind == "photo" ? "photo" : "file", "title": m.title, "options": options]
    }
  }
  /// Whether there's enough to make cards from (the Make cards button shows it; pressing it before does nothing).
  var ready: Bool {
    if m.from != nil { return true }
    func n(_ s: String) -> Int { s.trimmingCharacters(in: .whitespacesAndNewlines).utf16.count }
    switch m.kind {
    case "topic": return n(m.topic) >= 2
    case "paste": return n(m.text) >= 20
    case "video": return usesTranscript ? n(m.text) >= 20 && m.url.contains("youtu") : m.url.contains("youtu")
    default: return !m.files.isEmpty && m.note.isEmpty
    }
  }

  /// Makes the cards: sends the files, starts the job, runs its parts, and joins them for checking. (A design screen sends nothing.)
  func make() {
    guard ready, m.step != "making", !env.demo else { return }
    run += 1
    let mine = run, body = sourceBody()
    m.step = "making"; m.error = nil; m.cards = []; m.figures = 0; m.notes = nil; m.job = ""
    m.progress = MakeProgress(word: m.files.isEmpty ? MakeFlow.words[m.kind] ?? "Getting ready…" : "Sending your " + (m.kind == "photo" ? "pictures" : m.kind == "record" ? "recording" : "file") + "…", phase: "send", i: 0, n: max(1, m.files.reduce(0) { $0 + $1.uploads.count }))
    task = Task { await self.runMake(mine, body) }
  }
  private func isMine(_ mine: Int) -> Bool { mine == run }
  private func fail(_ e: Error, _ mine: Int) {
    if e is CancellationError || !isMine(mine) { return }
    let e = (e as? MakeError) ?? MakeError(message: MakeAPI.generic)
    if e.signedOut { env.signedOut(); return }
    m.step = "error"
    m.error = MakeErr(message: e.message.isEmpty ? MakeAPI.generic : e.message, pro: e.pro, code: e.code, network: e.network, again: !m.job.isEmpty && MakeFlow.worthAnotherGo(e))
  }
  /// An error is worth trying again when the AI or the network was the trouble (a limit or a bad file will say the same again).
  static func worthAnotherGo(_ e: MakeError) -> Bool { e.code.isEmpty || ["ai", "busy", "off"].contains(e.code) }
  private func runMake(_ mine: Int, _ first: [String: Any]) async {
    do {
      var body = first
      if m.from == nil && ["file", "photo", "record"].contains(m.kind) {
        var ids: [String] = []
        // (A recording that was cut into parts sends each part, one after another, as a file of its own.)
        let files = m.files.flatMap(\.uploads)
        for f in files {
          ids.append(try await api.sendFile(f))
          guard isMine(mine) else { return }
          m.progress.i = ids.count; m.progress.n = files.count
        }
        body["uploads"] = ids
        if m.kind == "record" && !m.seconds.isEmpty { body["seconds"] = m.seconds }
        // (A part's own length is there for the server to fall back on when a file's header doesn't say; it reads it from the file first.)
        else if files.contains(where: { $0.seconds > 0 }) { body["seconds"] = files.map { ($0.seconds * 100).rounded() / 100 } }
        // The parts of one recording have names like "Lecture (part 3 of 12).m4a": the make is named for the recording itself.
        let cutOnes = m.files.filter { !$0.parts.isEmpty }
        if (body["title"] as? String ?? "").isEmpty, cutOnes.count == 1, m.files.count == 1 {
          let base = String(((cutOnes[0].name as NSString).deletingPathExtension).prefix(100))
          body["title"] = base.isEmpty ? "Recording" : base
        }
      }
      m.progress = MakeProgress(word: MakeFlow.words[m.kind] ?? "Getting ready…", phase: "start", i: 0, n: 1)
      // (Not cut short by Cancel: the server may be making the job already, and its id must come so it can be given back.)
      let sendBody = body
      let s = try await Task.detached { [api] in try await api.call("api/make/start", sendBody) }.value
      let job = s["job"] as? String ?? ""
      // Stopped while it was starting: the make that began is given back too (the page that stopped it never heard its id).
      guard isMine(mine) else { if !job.isEmpty { Task { _ = try? await self.api.call("api/make/cancel", ["job": job]) } }; return }
      m.job = job; m.name = s["name"] as? String ?? ""
      var parts = s["parts"] as? Int ?? 0
      if s["phase"] as? String == "read" {
        try await steps(job, "read", s["read"] as? Int ?? 0, mine, MakeFlow.words[m.kind] ?? "Reading…")
        guard isMine(mine) else { return }
        parts = try await api.call("api/make/plan", ["job": job])["parts"] as? Int ?? 0
        guard isMine(mine) else { return }
      }
      try await steps(job, "write", parts, mine, "Writing cards…")
      guard isMine(mine) else { return }
      try await see(job, s["see"] as? Int ?? 0, mine)
      guard isMine(mine) else { return }
      try await finish(job, mine)
    } catch { fail(error, mine) }
  }
  /// The pictures of the file looked at, a few at a time, for diagrams. They are a bonus: when the AI can't be reached for them the cards still come, without diagrams.
  private func see(_ job: String, _ n: Int, _ mine: Int) async throws {
    guard n > 0 else { return }
    do { try await steps(job, "see", n, mine, "Looking at your pictures…") }
    catch let e as MakeError { if e.code == "gone" || e.signedOut { throw e } }
  }
  /// Every part's cards, joined: the cards to check.
  private func finish(_ job: String, _ mine: Int) async throws {
    let f = try await api.call("api/make/finish", ["job": job])
    guard isMine(mine) else { return }
    guard let list = f["cards"] as? [[String: Any]] else { throw MakeError(message: MakeAPI.generic) }
    m.cards = list.enumerated().map { i, c in
      let boxes = (c["boxes"] as? [[String: Any]] ?? []).enumerated().map { j, b -> OccBox in
        let n = { (k: String) in (b[k] as? NSNumber)?.doubleValue ?? 0 }
        return OccBox(id: "b\(j + 1)", x: n("x"), y: n("y"), w: n("w"), h: n("h"))
      }
      return MakeCard(key: "k" + String(c["k"] as? Int ?? i + 1), kind: c["kind"] as? String ?? "basic", front: c["front"] as? String ?? "", back: c["back"] as? String ?? "", text: c["text"] as? String ?? "",
                      at: c["at"] as? String ?? "", speak: c["speak"] as? String ?? "", lang: c["lang"] as? String ?? "",
                      pic: c["pic"] as? String ?? "", image: c["image"] as? String ?? "", parts: c["parts"] as? [String] ?? [], boxes: boxes)
    }
    m.figures = f["figures"] as? Int ?? 0
    m.notes = MakeNotes(f["notes"]); m.keepNotes = true; m.notesOpen = false
    if m.title.isEmpty { m.title = f["name"] as? String ?? "" }
    m.step = "review"
  }
  /// Each part, up to three at a time; a part that fails because of the network or the AI is tried again twice.
  private func steps(_ job: String, _ phase: String, _ n: Int, _ mine: Int, _ word: String) async throws {
    let c = StepCount()
    m.progress = MakeProgress(word: word, phase: phase, i: 0, n: n)
    guard n > 0 else { return }
    try await withThrowingTaskGroup(of: Void.self) { group in
      for _ in 0..<min(3, n) {
        group.addTask { @MainActor in
          while c.next < n && self.isMine(mine) {
            let i = c.next; c.next += 1
            var tries = 0
            while true {
              do { _ = try await self.api.call("api/make/step", ["job": job, "phase": phase, "i": i]); break }
              catch let e as MakeError {
                guard self.isMine(mine) else { return }
                if tries >= 2 || (e.status != 0 && e.status < 500 && e.status != 429) || e.code == "gone" || e.signedOut { throw e }
                try await Task.sleep(nanoseconds: UInt64(900 * (tries + 1)) * 1_000_000)
                tries += 1
              }
            }
            c.done += 1
            if self.isMine(mine) { self.m.progress = MakeProgress(word: word, phase: phase, i: c.done, n: n) }
          }
        }
      }
      try await group.waitForAll()
    }
  }
  /// Stops whatever is running (and a recording), and says which make it was, without changing what's on the page.
  private func stopRun() -> String { run += 1; task?.cancel(); task = nil; recorder.discard(); return m.job }
  /// Stops what's being made. The server gives today's make back if nothing was made yet.
  func cancel() {
    let job = stopRun()
    m.step = m.kind.isEmpty ? "pick" : "add"; m.job = ""; m.error = nil; m.cards = []; m.progress = MakeProgress(); m.limitNote = ""
    if !job.isEmpty && !env.demo { Task { _ = try? await self.api.call("api/make/cancel", ["job": job]) } }
  }
  /// Tries the same thing again: from the part that failed (what was made is kept), or from the start.
  func retry() {
    let job = m.job
    guard !env.demo else { return }
    if !job.isEmpty, m.error?.again == true {
      m.step = "making"; m.error = nil
      run += 1
      let mine = run
      task = Task { [self] in
        do { try await continueJob(job, mine) } catch { fail(error, mine) }
      }
    } else { m.step = m.kind.isEmpty ? "pick" : "add"; m.error = nil; m.job = "" }
  }
  private func continueJob(_ job: String, _ mine: Int) async throws {
    let s = try await api.call("api/make/job", nil, method: "GET")
    if (s["job"] as? String ?? "").isEmpty || s["job"] as? String != job { throw MakeError(message: "That make isn’t there anymore. Start again.", code: "gone") }
    var parts = s["parts"] as? Int ?? 0
    if s["phase"] as? String == "read" {
      try await steps(job, "read", s["read"] as? Int ?? 0, mine, MakeFlow.words[m.kind] ?? "Reading…")
      guard isMine(mine) else { return }
      parts = try await api.call("api/make/plan", ["job": job])["parts"] as? Int ?? 0
    }
    try await steps(job, "write", parts, mine, "Writing cards…")
    guard isMine(mine) else { return }
    try await see(job, s["see"] as? Int ?? 0, mine)
    guard isMine(mine) else { return }
    try await finish(job, mine)
  }

  // ---------- checking the cards ----------
  func edit(_ key: String, _ f: (inout MakeCard) -> Void) { if let i = m.cards.firstIndex(where: { $0.key == key }) { f(&m.cards[i]) } }
  func openCard(_ key: String) { m.editing = m.editing == key ? "" : key }
  func remove(_ key: String, gone: Bool = true) { edit(key) { $0.gone = gone }; if m.editing == key { m.editing = "" } }
  var kept: [MakeCard] { m.cards.filter { !$0.gone } }
  /// How many cards the kept rows make: a picture is one row to keep or leave out, and makes a card for each label hidden in it.
  var keptCount: Int { kept.reduce(0) { $0 + ($1.kind == "image" ? max(1, $1.parts.count) : 1) } }
  /// The deck the kept cards go to, in words ("Cell Biology", what was typed, the source's name, or "a new deck").
  var into: String {
    let chosen = m.opts.deckId.isEmpty ? nil : env.decks().first { $0.id == m.opts.deckId }
    let typed = m.opts.deckName.trimmingCharacters(in: .whitespacesAndNewlines)
    return chosen?.name ?? [typed, m.title, m.name].first { !$0.isEmpty } ?? "a new deck"
  }
  /// The kept cards go into the deck (new, or the one picked), the source is recorded on it, and the deck opens.
  func save() {
    guard !m.saving, !env.demo else { return }
    let keep = kept.map { c -> [String: Any] in
      var d: [String: Any] = ["kind": c.kind, "front": c.front, "back": c.back, "text": c.text, "at": c.at]
      if c.kind == "audio" { d["speak"] = c.speak; d["lang"] = c.lang }
      if c.kind == "image" { d["pic"] = c.pic }
      return d
    }
    if keep.isEmpty { m.error = MakeErr(message: "There are no cards to save.", soft: true); return }
    m.saving = true; m.error = nil
    let job = m.job, o = m.opts, notes = m.notes, keepNotes = m.keepNotes && !notesFull
    let name = [o.deckName.trimmingCharacters(in: .whitespacesAndNewlines), m.title, m.name].first { !$0.isEmpty } ?? "New deck"
    let deck: [String: Any] = o.deckId.isEmpty ? ["name": name] : ["id": o.deckId]
    Task {
      do {
        // (`notes` goes only when the make drafted some: true keeps them with the cards, false leaves them out, as it does for a deck that has no room for them.)
        var body: [String: Any] = ["job": job, "deck": deck, "cards": keep]
        if notes != nil { body["notes"] = keepNotes }
        let r = try await api.call("api/make/save", body)
        let id = r["deckId"] as? String
        await env.reload()
        env.leave(id)
      } catch let e as MakeError {
        m.saving = false
        if e.signedOut { env.signedOut(); return }
        m.error = MakeErr(message: e.message, soft: true, pro: e.pro, code: e.code)
      } catch { m.saving = false }
    }
  }
  /// Throws the make away (its files go, today's make comes back if nothing was made), and the flow ends.
  func discard() {
    let job = stopRun()
    if !job.isEmpty && !env.demo { Task { _ = try? await self.api.call("api/make/cancel", ["job": job]) } }
    env.leave(nil)
  }
}

