// How the iPhone app's make-cards flow talks to the server and what it checks (Data/MakeData.swift, web/make.js ported), against the stand-in
// server js/make-server.mjs: every part is asked for once, three at a time, and a part that fails is tried again twice (but not for a bad
// file); the server's own words, code and pro are kept; a 401 is signed out; Cancel (even while it's starting) tells the server; a file goes
// where it's told (this server's path with the cookie, the storage's address with its headers and no cookie); what's saved is what was kept;
// and the rules for what can be picked, a long recording picked from Files cut into parts of at most ten minutes (each its own file, in
// order, sent one after another), and the recorder's ten-minute files. Run by ios/tests/make-check.sh with -server <the stand-in's address>
// (and -fixtures <folder>).
import Foundation
import ImageIO
import AVFoundation
import UniformTypeIdentifiers

var passed = 0, failed = 0
func check(_ ok: Bool, _ name: String) { if ok { passed += 1; print("  ok   " + name) } else { failed += 1; print("  FAIL " + name) } }

let args = ProcessInfo.processInfo.arguments
func arg(_ n: String) -> String { args.firstIndex(of: n).flatMap { $0 + 1 < args.count ? args[$0 + 1] : nil } ?? "" }
let server = arg("-server"), fixtures = arg("-fixtures")

func cookie(_ who: String) {
  HTTPCookieStorage.shared.setCookie(HTTPCookie(properties: [.name: "lc_dev", .value: who, .domain: "127.0.0.1", .path: "/", .expires: Date().addingTimeInterval(3600)])!)
}
func post(_ path: String, _ body: [String: Any] = [:]) async {
  var r = URLRequest(url: URL(string: server + path)!); r.httpMethod = "POST"; r.httpBody = try? JSONSerialization.data(withJSONObject: body)
  _ = try? await URLSession.shared.data(for: r)
}
func look() async -> (entries: [[String: Any]], peak: Int) {
  let (data, _) = (try? await URLSession.shared.data(from: URL(string: server + "/__log")!)) ?? (Data(), URLResponse())
  let j = (try? JSONSerialization.jsonObject(with: data)) as? [String: Any] ?? [:]
  return (j["log"] as? [[String: Any]] ?? [], j["peak"] as? Int ?? 0)
}
func entries(_ path: String) async -> [[String: Any]] { await look().entries.filter { $0["path"] as? String == path } }

@MainActor final class Spy { var signedOut = 0, reloaded = 0, left: [String?] = [] }
@MainActor func newFlow(_ who: String, _ spy: Spy, info: MakeInfo = .pro, materials: @escaping (String) -> DeckMaterials? = { _ in nil }) -> MakeFlow {
  cookie(who)
  let env = MakeEnv(info: { info }, decks: { [MakeDeckRef(id: "d1", name: "Cell Biology"), MakeDeckRef(id: "d2", name: "Studied", readOnly: true)] }, materials: materials,
                    reload: { spy.reloaded += 1 }, signedOut: { spy.signedOut += 1 }, leave: { spy.left.append($0) })
  return MakeFlow(env: env, api: MakeAPI(base: { URL(string: server)! }))
}
@MainActor func until(_ s: Double = 30, _ cond: () -> Bool) async -> Bool {
  let end = Date().addingTimeInterval(s)
  while Date() < end { if cond() { return true }; try? await Task.sleep(nanoseconds: 40_000_000) }
  return cond()
}
func untilServer(_ s: Double = 8, _ cond: () async -> Bool) async -> Bool {
  let end = Date().addingTimeInterval(s)
  while Date() < end { if await cond() { return true }; try? await Task.sleep(nanoseconds: 80_000_000) }
  return await cond()
}
func tmp(_ name: String, bytes: Int = 100) -> URL {
  let dir = FileManager.default.temporaryDirectory.appendingPathComponent("make-check-" + UUID().uuidString, isDirectory: true)
  try? FileManager.default.createDirectory(at: dir, withIntermediateDirectories: true)
  let u = dir.appendingPathComponent(name)
  FileManager.default.createFile(atPath: u.path, contents: Data(count: 0))
  if let h = try? FileHandle(forWritingTo: u) { try? h.truncate(atOffset: UInt64(bytes)); try? h.close() }
  return u
}
func pixels(_ url: URL) -> (w: Int, h: Int)? {
  guard let s = CGImageSourceCreateWithURL(url as CFURL, nil), let p = CGImageSourceCopyPropertiesAtIndex(s, 0, nil) as? [CFString: Any], let w = p[kCGImagePropertyPixelWidth] as? Int, let h = p[kCGImagePropertyPixelHeight] as? Int else { return nil }
  return (w, h)
}
/// A picture made here (a flat color), in the format asked for.
func picture(_ name: String, w: Int, h: Int, type: UTType) -> URL {
  let u = tmp(name, bytes: 0)
  let c = CGContext(data: nil, width: w, height: h, bitsPerComponent: 8, bytesPerRow: 0, space: CGColorSpaceCreateDeviceRGB(), bitmapInfo: CGImageAlphaInfo.noneSkipLast.rawValue)!
  c.setFillColor(CGColor(red: 0.2, green: 0.4, blue: 0.9, alpha: 1)); c.fill(CGRect(x: 0, y: 0, width: w, height: h))
  let d = CGImageDestinationCreateWithURL(u as CFURL, type.identifier as CFString, 1, nil)!
  CGImageDestinationAddImage(d, c.makeImage()!, nil); CGImageDestinationFinalize(d)
  return u
}

/// A WAV of silence (mono), `seconds` long, written in chunks so even an hour doesn't sit in memory.
func wav(_ name: String, seconds: Double, rate: Int = 8000, bits: Int = 16) -> URL {
  let u = tmp(name, bytes: 0), per = bits / 8, dataBytes = Int(seconds * Double(rate)) * per
  var h = Data()
  func le32(_ v: Int) { var x = UInt32(v).littleEndian; h.append(Data(bytes: &x, count: 4)) }
  func le16(_ v: Int) { var x = UInt16(v).littleEndian; h.append(Data(bytes: &x, count: 2)) }
  h.append(Data("RIFF".utf8)); le32(36 + dataBytes); h.append(Data("WAVEfmt ".utf8)); le32(16); le16(1); le16(1); le32(rate); le32(rate * per); le16(per); le16(bits)
  h.append(Data("data".utf8)); le32(dataBytes)
  let fh = try! FileHandle(forWritingTo: u)
  try! fh.write(contentsOf: h)
  let chunk = Data(repeating: bits == 8 ? 0x80 : 0, count: 1 << 20)
  var left = dataBytes
  while left > 0 { let n = min(left, chunk.count); try! fh.write(contentsOf: chunk.prefix(n)); left -= n }
  try! fh.close()
  return u
}
/// How long a sound file is, as AVFoundation reads it (0 when it can't).
func seconds(_ url: URL) async -> Double { ((try? await AVURLAsset(url: url).load(.duration))?.seconds).flatMap { $0.isFinite ? $0 : nil } ?? 0 }
/// Whether the server was told to give back this make (its id is in a cancel, whenever it came).
func cancelled(_ job: String) async -> Bool { (await entries("/api/make/cancel")).contains { ($0["body"] as? [String: Any])?["job"] as? String == job } }

@MainActor func run() async {
  let spy = Spy()
  await post("/__reset")

  // ---------- a make that goes well ----------
  var f = newFlow("okay", spy)
  f.enter(MakeStart(kind: "topic")); f.setTopic("The Krebs cycle")
  check(f.m.step == "add" && f.m.kind == "topic" && f.ready, "a topic opens its page, and it's ready to make")
  f.make()
  check(f.m.step == "making" && f.m.progress.word == "Thinking about your topic…", "making starts at once, in plain words")
  check(await until { f.m.step == "review" }, "it ends in the cards to check")
  var L = await look()
  let paths = L.entries.compactMap { $0["path"] as? String }
  let stepLog = L.entries.filter { $0["path"] as? String == "/api/make/step" }
  check(paths.first == "/api/make/start" && paths.last == "/api/make/finish" && stepLog.count == 9, "start, then each of the 9 parts once, then finish (\(paths.count) requests)")
  check(L.peak == 3, "three parts at a time, no more (\(L.peak) at once)")
  check(stepLog.allSatisfy { ($0["body"] as? [String: Any])?["phase"] as? String == "write" } && Set(stepLog.compactMap { ($0["body"] as? [String: Any])?["i"] as? Int }) == Set(0..<9), "every part from 0 to 8, in the writing phase")
  let start = (L.entries.first?["body"] as? [String: Any]) ?? [:], opts = start["options"] as? [String: Any] ?? [:]
  check(start["kind"] as? String == "topic" && start["topic"] as? String == "The Krebs cycle" && opts["count"] as? String == "auto" && opts["kinds"] as? [String] == ["basic", "cloze"], "start says the topic, Auto, and both kinds of card")
  check(f.m.cards.count == 4 && f.m.cards[0].key == "k1" && f.m.cards[3].kind == "cloze" && f.m.title == "Sample" && f.m.name == "Sample topic", "the cards, named for what they came from")
  check(f.m.job.hasPrefix("j") && !f.m.job.isEmpty, "the job is remembered")

  // ---------- saving what was kept ----------
  f.remove("k2"); f.edit("k1") { $0.front = "Edited?" }; f.setOpt { $0.deckName = "My deck" }
  check(f.kept.count == 3 && f.into == "My deck", "one card removed: three are kept, going into the typed deck")
  f.save()
  check(await until { !spy.left.isEmpty }, "saving leaves the flow, to the deck that was made")
  check(spy.left == ["dk1"] && spy.reloaded == 1, "the library is brought up to date first")
  var save = (await entries("/api/make/save")).first?["body"] as? [String: Any] ?? [:]
  var cs = save["cards"] as? [[String: Any]] ?? []
  check(save["job"] as? String == f.m.job && (save["deck"] as? [String: Any])?["name"] as? String == "My deck", "save names the job and a new deck")
  check(cs.count == 3 && cs[0]["front"] as? String == "Edited?" && !cs.contains { $0["front"] as? String == "Question 2?" } && cs[2]["text"] as? String == "The [[answer]] is four.", "what's sent is what was kept, edited (\(cs.count) cards)")
  check(Set(cs[0].keys) == ["kind", "front", "back", "text", "at"], "each card with its kind, words, and place")
  // into a deck that was picked, and the deck's name when none was picked or typed
  spy.left = []
  f = newFlow("okay", spy); f.enter(MakeStart(kind: "topic", deckId: "d1")); f.setTopic("Again"); f.make()
  check(await until { f.m.step == "review" }, "a second make")
  check(f.m.opts.deckId == "d1" && f.into == "Cell Biology", "a deck given to the flow is where the cards go")
  f.save()
  check(await until { !spy.left.isEmpty }, "saved into it")
  save = (await entries("/api/make/save")).last?["body"] as? [String: Any] ?? [:]
  check((save["deck"] as? [String: Any])?["id"] as? String == "d1" && (save["deck"] as? [String: Any])?["name"] == nil, "save names the deck by its id")
  f = newFlow("okay", spy); f.enter(MakeStart(kind: "topic")); f.setTopic("Untyped"); f.make()
  check(await until { f.m.step == "review" }, "a third make")
  check(f.into == "Sample", "with no deck given or typed the cards go into one named for the source")
  f.cancel()

  // ---------- a part that fails is tried again twice ----------
  await post("/__reset"); await post("/__mode", ["who": "flaky", "mode": "flaky2"])
  f = newFlow("flaky", spy); f.enter(MakeStart(kind: "topic")); f.setTopic("Flaky"); f.make()
  var t0 = Date()
  check(await until(60) { f.m.step == "review" }, "parts that fail twice (the AI) still end in cards")
  var n = (await look()).entries.filter { $0["path"] as? String == "/api/make/step" }
  check(n.count == 27 && n.allSatisfy { ($0["attempt"] as? Int ?? 0) <= 3 }, "each part was tried three times in all, no more (\(n.count) asks for 9 parts)")
  check(Date().timeIntervalSince(t0) > 2.5, "with a wait before each go (\(String(format: "%.1f", Date().timeIntervalSince(t0))) s)")
  f.cancel()
  await post("/__reset"); await post("/__mode", ["who": "flaky", "mode": "flaky3"])
  f = newFlow("flaky", spy); f.enter(MakeStart(kind: "topic")); f.setTopic("Down"); f.make()
  check(await until(60) { f.m.step == "error" }, "parts that always fail end in an error page")
  check(f.m.error?.message == "The AI didn’t answer. Try again in a moment." && f.m.error?.code == "ai" && f.m.error?.again == true && f.m.error?.soft == false, "with the server's own words, and Try again (the AI was the trouble)")
  check(!f.m.job.isEmpty, "the job is kept, so what was made stays")
  n = (await look()).entries.filter { $0["path"] as? String == "/api/make/step" }
  check(n.allSatisfy { ($0["attempt"] as? Int ?? 0) <= 3 }, "no part was asked for more than three times")
  await post("/__mode", ["who": "flaky", "mode": ""])
  f.retry()
  check(f.m.step == "making" && f.m.error == nil, "Try again goes back to making")
  check(await until(60) { f.m.step == "review" }, "and carries on to the cards")
  check(!(await entries("/api/make/job")).isEmpty, "asking the server where the job stands first")
  // Back from an error page with a job goes to the making page (web/make.js back)
  f.cancel()
  await post("/__mode", ["who": "flaky", "mode": "flaky3"])
  f = newFlow("flaky", spy); f.enter(MakeStart(kind: "topic")); f.setTopic("Down"); f.make()
  check(await until(60) { f.m.step == "error" }, "an error page again")
  f.back()
  check(f.m.step == "making", "Back from an error that has a job goes to the making page, like the web")
  f.cancel()
  check(f.m.step == "add" && f.m.job.isEmpty, "where Cancel goes back to the page it was on")
  await post("/__mode", ["who": "flaky", "mode": ""])

  // ---------- a bad file isn't asked again; busy is; a cancelled make says why ----------
  await post("/__reset"); await post("/__mode", ["who": "bad", "mode": "bad400"])
  f = newFlow("bad", spy); f.enter(MakeStart(kind: "topic")); f.setTopic("Bad"); f.make()
  check(await until { f.m.step == "error" }, "a part the server can't read ends in an error")
  n = (await look()).entries.filter { $0["path"] as? String == "/api/make/step" }
  check(n.allSatisfy { ($0["attempt"] as? Int ?? 0) == 1 }, "and none was asked again (it would say the same)")
  check(f.m.error?.code == "unreadable" && f.m.error?.again == false && f.m.error?.message == "Lucida couldn’t read that. Try a different file.", "with its words and no Try again")
  f.cancel()
  await post("/__reset"); await post("/__mode", ["who": "busy", "mode": "busy429"])
  f = newFlow("busy", spy); f.enter(MakeStart(kind: "topic")); f.setTopic("Busy"); f.make()
  check(await until(60) { f.m.step == "review" }, "a 429 (too many at once) is waited out")
  n = (await look()).entries.filter { $0["path"] as? String == "/api/make/step" }
  check(n.count == 18, "each part twice (\(n.count))")
  f.cancel()
  await post("/__reset"); await post("/__mode", ["who": "gone", "mode": "gone"])
  f = newFlow("gone", spy); f.enter(MakeStart(kind: "topic")); f.setTopic("Gone"); f.make()
  check(await until { f.m.step == "error" }, "a make the server says is gone ends in an error")
  n = (await look()).entries.filter { $0["path"] as? String == "/api/make/step" }
  check(f.m.error?.code == "gone" && f.m.error?.again == false && n.count <= 3, "not asked again, no Try again (\(n.count) asks)")
  f.cancel()

  // ---------- the server's words: a limit, and signed out ----------
  await post("/__reset")
  f = newFlow("limit", spy); f.enter(MakeStart(kind: "topic")); f.setTopic("Too many"); f.make()
  check(await until { f.m.step == "error" }, "the day's limit ends in an error page")
  check(f.m.error?.message == "That’s today’s 3 free makes. Go Pro for 30 a day." && f.m.error?.code == "day" && f.m.error?.pro == true && f.m.error?.again == false, "with the server's words, Go Pro, and no Try again")
  check((await entries("/api/make/step")).isEmpty && f.m.job.isEmpty, "no part was asked for")
  f.back()
  check(f.m.step == "add" && f.m.kind == "topic", "Back goes to the page it was on")
  f = newFlow("out", spy); f.enter(MakeStart(kind: "topic")); f.setTopic("Signed out"); f.make()
  check(await until(5) { spy.signedOut > 0 }, "a 401 is signed out")
  check(f.m.step != "error", "and not an error page")

  // ---------- where a file goes ----------
  await post("/__reset")
  var file = tmp("notes.txt", bytes: 5000)
  f = newFlow("sameorigin", spy); f.enter(MakeStart(kind: "file"))
  await f.addFiles([PickedFile(url: file, name: "notes.txt")])
  check(f.m.files.count == 1 && f.m.files[0].name == "notes.txt" && f.m.files[0].fam == .doc && f.m.files[0].type == "text/plain" && f.m.files[0].size == 5000, "a text file is added, with its size and type")
  f.make()
  check(await until { f.m.step == "review" }, "a file's make goes through")
  L = await look()
  let up = L.entries.first { $0["path"] as? String == "/api/make/upload" }?["body"] as? [String: Any] ?? [:]
  check(up["name"] as? String == "notes.txt" && up["type"] as? String == "text/plain" && up["size"] as? Int == 5000, "the server is told the name, type and size first")
  var put = L.entries.first { ($0["path"] as? String ?? "").hasPrefix("/api/make/put/") }
  check(put != nil && put?["method"] as? String == "PUT" && put?["bytes"] as? Int == 5000 && (put?["cookie"] as? String ?? "").contains("lc_dev=sameorigin"), "a path on this server: the bytes go there, with the person's cookie")
  let sent = (L.entries.first { $0["path"] as? String == "/api/make/start" }?["body"] as? [String: Any])?["uploads"] as? [String] ?? []
  check(sent.count == 1 && (put?["path"] as? String)?.hasSuffix(sent[0]) == true, "start names the file that went up")
  f.cancel()
  await post("/__reset")
  f = newFlow("directly", spy); f.enter(MakeStart(kind: "file"))
  await f.addFiles([PickedFile(url: file, name: "notes.txt")])
  f.make()
  check(await until { f.m.step == "review" }, "a file that goes straight to storage")
  L = await look()
  put = L.entries.first { ($0["path"] as? String ?? "").hasPrefix("/storage/") }
  check(put != nil && put?["bytes"] as? Int == 5000 && put?["method"] as? String == "PUT", "an https address: the bytes go there")
  check(put?["cookie"] as? String == "" && put?["test"] as? String == "yes" && put?["type"] as? String == "text/plain", "with the headers it gave, and no cookie (\(put?["cookie"] as? String ?? "?"))")
  check(!L.entries.contains { ($0["path"] as? String ?? "").hasPrefix("/api/make/put/") }, "and nothing through this server")
  f.cancel()

  // ---------- Cancel ----------
  await post("/__reset")
  f = newFlow("slowstart", spy); f.enter(MakeStart(kind: "topic")); f.setTopic("Slow"); f.make()
  try? await Task.sleep(nanoseconds: 300_000_000)
  f.cancel()
  check(f.m.step == "add" && f.m.job.isEmpty, "Cancel while it's starting goes back at once")
  // (The stand-in takes a second and a half to start, and the make's id only exists then. A cancel from the flow before this one may still be
  // on its way and land after the reset: so look for the cancel that names this make, not for any.)
  var started = "?"
  check(await untilServer(10) {
    started = (await entries("/api/make/start")).first?["job"] as? String ?? "?"
    if started == "?" { return false }
    return await cancelled(started)
  }, "the server hears about it")
  let heard = started == "?" ? false : await cancelled(started)
  check(heard, "the make that began is cancelled when its id arrives (\(started))")
  check((await entries("/api/make/step")).isEmpty, "and no part was run")
  await post("/__reset")
  f = newFlow("okay", spy); f.enter(MakeStart(kind: "topic")); f.setTopic("Mid"); f.make()
  check(await until { !f.m.job.isEmpty && f.m.progress.phase == "write" }, "a make under way")
  let job = f.m.job
  f.cancel()
  check(f.m.step == "add" && f.m.job.isEmpty && f.m.cards.isEmpty && f.m.progress == MakeProgress(), "Cancel goes back to the page, with nothing left over")
  check(await untilServer { await cancelled(job) }, "the server hears about that one too, and which make to give back")
  try? await Task.sleep(nanoseconds: 800_000_000)
  check(f.m.step == "add", "the parts still running don't bring it back")

  // ---------- what can be picked ----------
  f = newFlow("okay", spy, info: .free); f.enter(MakeStart(kind: "file"))
  await f.addFiles([PickedFile(url: tmp("virus.exe"), name: "virus.exe")])
  check(f.m.files.isEmpty && f.m.error?.message == "Lucida can’t read that kind of file. Try a PDF, slides, a Word file, pictures, or a recording." && f.m.error?.soft == true, "a kind of file it can't read says so")
  await f.addFiles([PickedFile(url: tmp("a.pdf", bytes: 400), name: "a.pdf"), PickedFile(url: tmp("b.pdf", bytes: 400), name: "b.pdf")])
  check(f.m.files.map(\.name) == ["a.pdf"] && f.m.error?.message == "Pick one document at a time.", "a second document is turned away")
  f.removeFile(f.m.files[0].id)
  await f.addFiles([PickedFile(url: tmp("talk.m4a", bytes: 400), name: "talk.m4a"), PickedFile(url: tmp("p.jpg", bytes: 400), name: "p.jpg")])
  check(f.m.files.map(\.name) == ["talk.m4a"] && f.m.error?.message == "Pick one kind of file at a time: pictures, or a recording, or one document.", "a picture beside a recording is turned away")
  f.removeFile(f.m.files[0].id)
  await f.addFiles([PickedFile(url: tmp("big.pdf", bytes: 21_000_000), name: "big.pdf")])
  check(f.m.files.isEmpty && f.m.error?.message == "That file is over 20 MB. Go Pro for up to 40 MB.", "a file over Free's 20 MB says so, with Go Pro")
  await f.addFiles([PickedFile(url: tmp("long.m4a", bytes: 26_000_000), name: "long.m4a")])
  check(f.m.files.isEmpty && f.m.error?.message == "That recording is too long to send in one piece, and Lucida couldn’t cut it into parts. Try a shorter one.", "a recording over 25 MB that can't be cut says so, in plain words (no Go Pro)")
  await f.addFiles([PickedFile(url: tmp("odd.mp3", bytes: 22_000_000), name: "odd.mp3")])
  check(f.m.files.count == 1 && f.m.files[0].parts.isEmpty && f.m.files[0].size == 22_000_000 && f.m.error == nil, "one it can't read but the server takes (22 MB) goes up as it is")
  f.removeFile(f.m.files[0].id)
  await f.addFiles([PickedFile(url: tmp("empty.pdf", bytes: 0), name: "empty.pdf")])
  check(f.m.files.isEmpty && f.m.error?.message == "That file is empty.", "an empty file says so")
  var pro = newFlow("okay", spy, info: .pro); pro.enter(MakeStart(kind: "file"))
  await pro.addFiles([PickedFile(url: tmp("big.pdf", bytes: 21_000_000), name: "big.pdf")])
  check(pro.m.files.count == 1 && pro.m.error == nil, "the same file is fine on Pro (40 MB)")
  pro.removeFile(pro.m.files[0].id)   // (one document at a time: the first one has to go before another is tried)
  await pro.addFiles([PickedFile(url: tmp("huge.pdf", bytes: 41_000_000), name: "huge.pdf")])
  check(pro.m.error?.message == "That file is over 40 MB." , "but not one over 40 MB, and Pro isn't told to go Pro")
  // pictures: small JPEGs, as many as the plan allows
  f = newFlow("okay", spy, info: MakeInfo(on: true, video: true, perDay: 3, pages: 30, minutes: 15, photos: 2, fileMB: 20)); f.enter(MakeStart(kind: "photo"))
  let big = picture("big.png", w: 3000, h: 2000, type: .png), heic = picture("shot.heic", w: 1200, h: 800, type: .heic), small = picture("tiny.png", w: 40, h: 30, type: .png)
  await f.addFiles([PickedFile(url: big, name: "big.png"), PickedFile(url: heic, name: "IMG_1.HEIC"), PickedFile(url: small, name: "tiny.png")])
  check(f.m.files.count == 2 && f.m.error?.message == "That’s the most pictures for one make (2).", "more pictures than the plan allows are turned away")
  check(f.m.files.map(\.name) == ["big.jpg", "IMG_1.jpg"] && f.m.files.allSatisfy { $0.type == "image/jpeg" && $0.fam == .image }, "pictures are listed as the JPEGs they'll go up as")
  let px = f.m.files.compactMap { pixels($0.url) }
  check(px.count == 2 && px[0].w == 1600 && px[0].h == 1067 && max(px[1].w, px[1].h) <= 1600, "the big one is made 1600 pixels across (\(px.map { "\($0.w)x\($0.h)" }))")
  check(f.m.files.allSatisfy { (try? Data(contentsOf: $0.url))?.prefix(3) == Data([0xFF, 0xD8, 0xFF]) }, "and each really is a JPEG, even the iPhone's HEIC")
  check(f.m.files.allSatisfy { $0.size == (try? FileManager.default.attributesOfItem(atPath: $0.url.path)[.size] as? Int) }, "their sizes are the sizes of what goes up")

  // ---------- a long recording picked from Files is cut into parts of at most ten minutes ----------
  let r4200 = MakeSplit.ranges(4200), r1210 = MakeSplit.ranges(1210)
  check(r4200.count == 7 && r4200.allSatisfy { abs(($0.to - $0.from) - 600) < 1e-9 } && r4200.first?.from == 0 && r4200.last?.to == 4200 && zip(r4200, r4200.dropFirst()).allSatisfy { $0.to == $1.from }, "70 minutes are seven parts of ten, one after the other")
  check(r1210.count == 3 && r1210.allSatisfy { abs(($0.to - $0.from) - 1210.0 / 3) < 1e-9 } && r1210[2].to == 1210 && r1210[1].to == r1210[2].from, "the parts are as long as each other, so there is no tiny one at the end (1210 seconds are three of \(Int(1210.0 / 3)))")
  check(MakeSplit.ranges(600.4).count == 2 && MakeSplit.ranges(600).count == 1 && MakeSplit.ranges(0).isEmpty && MakeSplit.ranges(.nan).isEmpty, "and 600 seconds is one part, nothing is none")
  let rBig = MakeSplit.ranges(600, size: 40_000_000)
  check(rBig.count == 2 && MakeSplit.ranges(600, size: 18_000_000).count == 1 && MakeSplit.ranges(300, size: 100_000_000).count == 1, "a recording that would weigh over 18 MB gets more parts, but one that is big only because it isn't compressed doesn't (a part is written again as AAC)")
  check(MakeSplit.needsCutting(size: 18_000_001, seconds: 60) && MakeSplit.needsCutting(size: 1_000_000, seconds: 601) && !MakeSplit.needsCutting(size: 18_000_000, seconds: 600) && MakeSplit.bigBytes == 18_000_000 && MakeSplit.longSeconds == 600, "over 18 MB or over ten minutes is cut (the web's own numbers); 18 MB and ten minutes aren't")
  await post("/__reset")
  let lecture = wav("Lecture 7.wav", seconds: 25 * 60)                 // 25 minutes, 24 MB
  f = newFlow("longrec", spy, info: .pro); f.enter(MakeStart(kind: "file"))
  await f.addFiles([PickedFile(url: lecture, name: "Lecture 7.wav")])
  let row = f.m.files.first
  check(f.m.files.count == 1 && row?.parts.count == 3 && row?.fam == .audio && f.m.error == nil && f.m.note.isEmpty, "a 25 minute recording is one row, cut into three parts (\(row?.parts.count ?? 0))")
  var lens: [Double] = []; for p in row?.parts ?? [] { lens.append(await seconds(p.url)) }
  check(lens.count == 3 && lens.allSatisfy { $0 <= 600.05 && abs($0 - 500) < 0.2 }, "of the same length, eight minutes and twenty seconds each (\(lens.map { String(format: "%.1f", $0) }))")
  check(row.map { MakeFlow.sizeLine($0).hasSuffix(" · 3 parts") } == true && row?.size == row?.parts.reduce(0, { $0 + $1.size }), "the row says its size and its parts, and the size is what goes up: “\(row.map(MakeFlow.sizeLine) ?? "")”")
  let names = (1...3).map { "Lecture 7 (part \($0) of 3).m4a" }
  check(row?.uploads.map(\.name) == names && row?.uploads.allSatisfy { $0.type == "audio/mp4" && $0.fam == .audio } == true, "each part is a file of its own, named in order")
  check(row?.parts.allSatisfy { (try? Data(contentsOf: $0.url))?.dropFirst(4).prefix(4) == Data("ftyp".utf8) } == true && row?.parts.allSatisfy { $0.size > 0 && $0.size <= 25_000_000 } == true, "each really is an m4a, and none is near the server's 25 MB")
  let partFolder = row?.parts.first?.url.deletingLastPathComponent().path ?? ""
  f.make()
  check(f.m.step == "making" && f.m.progress.phase == "send" && f.m.progress.n == 3 && f.m.progress.i == 0, "making starts by sending three files")
  check(await until(60) { f.m.step == "review" }, "the parts go up and it ends in cards")
  L = await look()
  let ups = L.entries.filter { $0["path"] as? String == "/api/make/upload" }.compactMap { $0["body"] as? [String: Any] }
  check(ups.map { $0["name"] as? String } == names && ups.map { $0["size"] as? Int } == row?.parts.map(\.size) && ups.allSatisfy { $0["type"] as? String == "audio/mp4" }, "the server was told each part's name and size, in order")
  let puts = L.entries.filter { ($0["path"] as? String ?? "").hasPrefix("/api/make/put/") }
  check(puts.map { $0["bytes"] as? Int } == row?.parts.map(\.size), "and each part's bytes went up in order, one after another")
  let startBody = (L.entries.first { $0["path"] as? String == "/api/make/start" }?["body"] as? [String: Any]) ?? [:]
  let sentIds = startBody["uploads"] as? [String] ?? []
  check(sentIds.count == 3 && zip(sentIds, puts).allSatisfy { (($1["path"] as? String) ?? "").hasSuffix($0) }, "start names the three, in order")
  check(startBody["title"] as? String == "Lecture 7", "and the make is named for the recording itself, not for a part (“\(startBody["title"] as? String ?? "")”)")
  check((startBody["seconds"] as? [Double])?.map { Int($0.rounded()) } == [500, 500, 500], "with each part's own length for the server to fall back on (\((startBody["seconds"] as? [Double]) ?? []))")
  f.cancel()
  f.removeFile(f.m.files[0].id)
  check(f.m.files.isEmpty && !FileManager.default.fileExists(atPath: partFolder), "taking the row out deletes its parts")
  var spare: MakeFlow? = newFlow("longrec", spy, info: .pro); spare?.enter(MakeStart(kind: "file"))
  await spare?.addFiles([PickedFile(url: lecture, name: "Lecture 7.wav")])
  let spareFolder = spare?.m.files.first?.parts.first?.url.deletingLastPathComponent().path ?? ""
  check(!spareFolder.isEmpty && FileManager.default.fileExists(atPath: spareFolder), "another copy, cut again")
  spare = nil
  check(!FileManager.default.fileExists(atPath: spareFolder), "its parts are deleted when the flow ends")
  // longer than the plan makes from: said at once, before anything is cut or sent
  await post("/__reset")
  f = newFlow("longrec", spy, info: .free); f.enter(MakeStart(kind: "file"))
  await f.addFiles([PickedFile(url: lecture, name: "Lecture 7.wav")])
  check(f.m.files.isEmpty && f.m.error?.message == "That recording is 25 minutes long. Free makes from up to 15 minutes at a time. Go Pro for up to 120." && f.m.error?.soft == true, "a Free person's 25 minute recording is turned away at once, in the server's words: “\(f.m.error?.message ?? "")”")
  let sentAny = !(await entries("/api/make/upload")).isEmpty
  check(f.m.note.isEmpty && !sentAny, "with nothing cut and nothing sent")
  let tooMuch = wav("Two hours and ten.wav", seconds: 130 * 60, rate: 4000, bits: 8)   // 130 minutes, 31 MB
  f = newFlow("longrec", spy, info: .pro); f.enter(MakeStart(kind: "file"))
  await f.addFiles([PickedFile(url: tooMuch, name: "Two hours and ten.wav")])
  check(f.m.files.isEmpty && f.m.error?.message == "That recording is 130 minutes long. Pro makes from up to 120 minutes at a time.", "so is a Pro person's 130 minutes: “\(f.m.error?.message ?? "")”")
  // a short one isn't cut; over 20 MB but short is made smaller (one part); over 20 minutes but under 20 MB is cut
  f = newFlow("longrec", spy, info: .pro); f.enter(MakeStart(kind: "file"))
  let shortOne = wav("Short.wav", seconds: 3 * 60)
  await f.addFiles([PickedFile(url: shortOne, name: "Short.wav")])
  let shortSize = (try? FileManager.default.attributesOfItem(atPath: shortOne.path)[.size] as? Int) ?? -1
  check(f.m.files.count == 1 && f.m.files[0].parts.isEmpty && f.m.files[0].size == shortSize && f.m.files[0].uploads.count == 1 && !MakeFlow.sizeLine(f.m.files[0]).contains("part"), "a three minute recording goes up as it is, and its row has no parts")
  f.removeFile(f.m.files[0].id)
  let fat = wav("Fat.wav", seconds: 7 * 60, rate: 44100)               // 7 minutes, 37 MB
  await f.addFiles([PickedFile(url: fat, name: "Fat.wav")])
  check(f.m.files.count == 1 && f.m.files[0].parts.count == 1 && f.m.files[0].size < 20_000_000 && !MakeFlow.sizeLine(f.m.files[0]).contains("part"), "a 7 minute recording over 20 MB is made smaller (\(f.m.files.first.map(MakeFlow.sizeLine) ?? "")), as one file")
  f.removeFile(f.m.files[0].id)
  let thin = wav("Thin.wav", seconds: 21 * 60, rate: 8000, bits: 8)    // 21 minutes, 10 MB
  await f.addFiles([PickedFile(url: thin, name: "Thin.wav")])
  check(f.m.files.count == 1 && f.m.files[0].parts.count == 3, "a 21 minute recording under 20 MB is cut too (\(f.m.files.first?.parts.count ?? 0) parts)")
  f.cancel()

  // ---------- caption files are documents ----------
  f = newFlow("okay", spy); f.enter(MakeStart(kind: "file"))
  await f.addFiles([PickedFile(url: tmp("lecture.srt", bytes: 400), name: "lecture.srt")])
  check(f.m.files.count == 1 && f.m.files[0].fam == .doc && f.m.files[0].name == "lecture.srt" && !f.m.files[0].type.isEmpty && f.m.files[0].type != "application/octet-stream" && f.m.error == nil, "an .srt file is listed as a document (\(f.m.files.first?.type ?? ""))")
  await f.addFiles([PickedFile(url: tmp("lecture.vtt", bytes: 400), name: "lecture.vtt")])
  check(f.m.files.map(\.name) == ["lecture.srt"] && f.m.error?.message == "Pick one document at a time.", "a .vtt beside it is turned away: one document at a time")
  f.removeFile(f.m.files[0].id)
  await f.addFiles([PickedFile(url: tmp("lecture.vtt", bytes: 400), name: "lecture.vtt")])
  check(f.m.files.count == 1 && f.m.files[0].fam == .doc && !f.m.files[0].type.isEmpty && f.ready, "a .vtt file is a document too, and it's enough to make from")
  f.make()
  check(await until { f.m.step == "review" }, "and its make goes through")
  L = await look()
  let capUp = L.entries.filter { $0["path"] as? String == "/api/make/upload" }.compactMap { $0["body"] as? [String: Any] }
  check(capUp.contains { $0["name"] as? String == "lecture.vtt" && $0["size"] as? Int == 400 }, "the server is told its name and size")
  f.cancel()

  // ---------- starter notes beside the cards ----------
  await post("/__reset")
  f = newFlow("notesy", spy); f.enter(MakeStart(kind: "topic")); f.setTopic("Notes please"); f.make()
  check(await until { f.m.step == "review" }, "a make that gets notes ends in the review")
  let startedOpts = ((await entries("/api/make/start")).last?["body"] as? [String: Any])?["options"] as? [String: Any]
  check(startedOpts?["notes"] as? Bool == true, "it asked for the notes (options.notes: true: the server drafts them only when asked)")
  check(f.m.notes?.title == "Sample" && f.m.notes?.sections.count == 2 && f.m.notes?.sections.first?.heading == "First idea" && f.m.notes?.sections.first?.at == "p. 1" && f.m.notes?.text.hasPrefix("# Sample") == true && f.m.notes?.overview == "What the sample is about.", "the notes come with their title, overview, notes and Markdown")
  check(f.m.keepNotes && !f.m.notesOpen && f.m.notes?.line(keep: true) == "2 notes · p. 1 to p. 3 · saved with the cards" && f.m.notes?.line(keep: false) == "2 notes · p. 1 to p. 3 · not saved", "kept by default, folded, and the line says how many and from where")
  check(MakeNotes(["title": "T", "sections": [["heading": "A", "at": "", "text": "x"]], "text": "# T"])?.line(keep: true) == "1 note · saved with the cards" && MakeNotes(["sections": [["heading": "A", "at": "p. 2", "text": "x"]]])?.line(keep: false) == "1 note · p. 2 · not saved" && MakeNotes(nil) == nil, "one note is “1 note”; with no place the line has none; no notes is nil")
  f.toggleNotesOpen(); check(f.m.notesOpen, "Read the notes unfolds them"); f.toggleNotesOpen(); check(!f.m.notesOpen, "and Hide the notes folds them")
  spy.left = []
  f.save()
  check(await until { !spy.left.isEmpty }, "saving leaves the flow")
  var saved = (await entries("/api/make/save")).last?["body"] as? [String: Any] ?? [:]
  check(saved["notes"] as? Bool == true, "save says to keep the notes (notes: true)")
  spy.left = []
  f = newFlow("notesy", spy); f.enter(MakeStart(kind: "topic")); f.setTopic("Notes off"); f.make()
  check(await until { f.m.step == "review" }, "another make that gets notes")
  f.setKeepNotes(false); check(f.m.notes?.line(keep: f.m.keepNotes) == "2 notes · p. 1 to p. 3 · not saved", "turning the switch off says the notes aren't saved")
  f.save()
  check(await until { !spy.left.isEmpty }, "saved without them")
  saved = (await entries("/api/make/save")).last?["body"] as? [String: Any] ?? [:]
  check(saved["notes"] as? Bool == false, "save says to leave the notes out (notes: false)")
  spy.left = []
  f = newFlow("okay", spy); f.enter(MakeStart(kind: "topic")); f.setTopic("No notes here"); f.make()
  check(await until { f.m.step == "review" }, "a make that gets none")
  check(f.m.notes == nil, "has no notes panel")
  f.save()
  check(await until { !spy.left.isEmpty }, "and saves")
  saved = (await entries("/api/make/save")).last?["body"] as? [String: Any] ?? [:]
  check(saved["notes"] == nil, "without a word about notes (the key isn't sent when the make drafted none)")
  // no notes are asked for from a Guide page, or from words in hand (a selection of one)
  let guideMats: (String) -> DeckMaterials? = { id in id == "d1" ? try? JSONDecoder().decode(DeckMaterials.self, from: Data(##"{"id":"d1","sources":[],"guide":{"text":"# Guide\n\nThe cell cycle has phases.","pages":[{"id":"g1","title":"Mnemonics","text":"PMAT for the phases of mitosis"}]}}"##.utf8)) : nil }
  f = newFlow("okay", spy, materials: guideMats); f.enter(MakeStart(guide: "d1"))
  check((f.sourceBody()["options"] as? [String: Any])?["notes"] as? Bool == false, "a make from a Guide asks for no notes (options.notes: false)")
  f.enter(MakeStart(guide: "d1", page: "g1")); check((f.sourceBody()["options"] as? [String: Any])?["notes"] as? Bool == false, "nor does one from a Guide page")
  f.enter(MakeStart(text: "Words in hand, from a selection.", title: "A selection")); check((f.sourceBody()["options"] as? [String: Any])?["notes"] as? Bool == false, "nor does one from a selection")
  f.enter(MakeStart(kind: "topic")); f.setTopic("Anything"); check((f.sourceBody()["options"] as? [String: Any])?["notes"] as? Bool == true, "any other make asks for them (options.notes: true)")
  check((f.sourceBody()["options"] as? [String: Any])?["mode"] == nil && f.sourceBody()["mode"] == nil, "and nothing asks for quiz questions")

  // ---------- a deck that has every page a Guide can have has no room for the notes ----------
  /// The library's word on a deck "d1" whose Guide has the given words and this many extra pages.
  func crowded(_ pages: Int, text: String = "# Guide\\n\\nMy own words.") -> (String) -> DeckMaterials? {
    let list = (0..<pages).map { ##"{"id":"g\##($0)","title":"Page \##($0)","text":""}"## }.joined(separator: ",")
    let json = ##"{"id":"d1","sources":[],"guide":{"text":"\##(text)","pages":[\##(list)]}}"##
    return { id in id == "d1" ? try? JSONDecoder().decode(DeckMaterials.self, from: Data(json.utf8)) : nil }
  }
  check((try? JSONDecoder().decode(MakeInfo.self, from: Data(##"{"on":true,"guidePages":4}"##.utf8)))?.guidePages == 4 && (try? JSONDecoder().decode(MakeInfo.self, from: Data(##"{"on":true}"##.utf8)))?.guidePages == 10 && MakeInfo.pro.guidePages == 10, "the library says how many pages a Guide can have (make.guidePages: 10 when it doesn't say)")
  await post("/__reset"); spy.left = []
  f = newFlow("notesy", spy, materials: crowded(10)); f.enter(MakeStart(kind: "topic", deckId: "d1")); f.setTopic("Crowded"); f.make()
  check(await until { f.m.step == "review" }, "a make into a deck whose Guide has all ten pages")
  check(f.m.notes != nil && f.notesFull, "its notes have no room")
  f.setKeepNotes(false); check(f.m.keepNotes && f.notesFull, "and the switch does nothing")
  f.save()
  check(await until { !spy.left.isEmpty }, "the cards are saved all the same")
  saved = (await entries("/api/make/save")).last?["body"] as? [String: Any] ?? [:]
  check(saved["notes"] as? Bool == false && (saved["deck"] as? [String: Any])?["id"] as? String == "d1", "and save leaves the notes out (notes: false), going into that deck")
  spy.left = []
  f = newFlow("notesy", spy, materials: crowded(9)); f.enter(MakeStart(kind: "topic", deckId: "d1")); f.setTopic("Room for one"); f.make()
  check(await until { f.m.step == "review" }, "a make into a deck whose Guide has nine")
  check(f.m.notes != nil && !f.notesFull, "its notes have room")
  f.setKeepNotes(false); check(!f.m.keepNotes, "and the switch works"); f.setKeepNotes(true)
  f.save()
  check(await until { !spy.left.isEmpty }, "saved")
  saved = (await entries("/api/make/save")).last?["body"] as? [String: Any] ?? [:]
  check(saved["notes"] as? Bool == true, "the notes go along (notes: true)")
  spy.left = []
  let few = MakeInfo(on: true, video: true, perDay: 30, pages: 300, minutes: 120, photos: 50, fileMB: 40, guidePages: 3)
  f = newFlow("notesy", spy, info: few, materials: crowded(3)); f.enter(MakeStart(kind: "topic", deckId: "d1")); f.setTopic("Fewer pages"); f.make()
  check(await until { f.m.step == "review" }, "when the library says a Guide may have three pages, a deck with three")
  check(f.notesFull, "has none left (it is the library's number, not ten)")
  spy.left = []
  f = newFlow("notesy", spy, materials: crowded(10)); f.enter(MakeStart(kind: "topic")); f.setTopic("A new deck"); f.make()
  check(await until { f.m.step == "review" }, "a make into a new deck")
  check(f.m.notes != nil && !f.notesFull, "a new deck has no Guide, so its notes have room")
  f = newFlow("notesy", spy, materials: crowded(0)); f.enter(MakeStart(kind: "topic", deckId: "d1")); f.setTopic("Only words"); f.make()
  check(await until { f.m.step == "review" }, "a make into a deck with a Guide of words and no pages")
  check(f.m.notes != nil && !f.notesFull, "has room")
  f = newFlow("notesy", spy); f.enter(MakeStart(kind: "topic", deckId: "d1")); f.setTopic("Not in the library"); f.make()
  check(await until { f.m.step == "review" }, "a make into a deck the library has no Guide for")
  check(f.m.notes != nil && !f.notesFull, "has room")
  f = newFlow("okay", spy, materials: crowded(10)); f.enter(MakeStart(kind: "topic", deckId: "d1")); f.setTopic("No notes at all"); f.make()
  check(await until { f.m.step == "review" }, "a full deck, a make with no notes")
  check(f.m.notes == nil && !f.notesFull, "has no panel to say anything in")

  // ---------- audio cards for a language ----------
  f = newFlow("okay", spy); f.enter(MakeStart(kind: "topic")); f.setTopic("Spanish words")
  check(f.m.opts.basic && f.m.opts.cloze && !f.m.opts.audio && (f.sourceBody()["options"] as? [String: Any])?["kinds"] as? [String] == ["basic", "cloze"], "audio starts off, and the kinds asked for are Basic and Fill in the blank")
  f.setOpt { $0.audio = true }
  check((f.sourceBody()["options"] as? [String: Any])?["kinds"] as? [String] == ["basic", "cloze"], "turning audio on with no language set doesn't ask for it (it only counts with a language)")
  f.setOpt { $0.lang = "es" }
  check(f.m.opts.lang == "es" && (f.sourceBody()["options"] as? [String: Any])?["kinds"] as? [String] == ["basic", "cloze", "audio"], "with a language, the kinds are Basic, Fill in the blank and Audio")
  check((f.sourceBody()["options"] as? [String: Any])?["lang"] as? String == "es", "and the language goes with them")
  f.setOpt { $0.lang = "" }
  check(!f.m.opts.audio && (f.sourceBody()["options"] as? [String: Any])?["kinds"] as? [String] == ["basic", "cloze"], "clearing the language turns audio off")
  f.setOpt { $0.lang = "fr" }; f.setOpt { $0.audio = true }; f.setOpt { $0.basic = false }; f.setOpt { $0.cloze = false }
  check(!f.m.opts.basic && !f.m.opts.cloze && f.m.opts.audio && (f.sourceBody()["options"] as? [String: Any])?["kinds"] as? [String] == ["audio"], "audio can be the only kind")
  f.setOpt { $0.audio = false }
  check(f.m.opts.audio, "and then it can't be switched off: one kind always stays on")
  f.setOpt { $0.lang = "" }
  check(f.m.opts.basic && f.m.opts.cloze && !f.m.opts.audio, "clearing the language when audio was the only kind gives Basic and Fill in the blank back")
  f.setOpt { $0.lang = "de" }; f.setOpt { $0.cloze = false }; f.setOpt { $0.basic = false }
  check(f.m.opts.basic && !f.m.opts.cloze && !f.m.opts.audio, "with no language set, the last of Basic and Fill in the blank stays on")
  await post("/__reset"); spy.left = []
  f = newFlow("audioy", spy); f.enter(MakeStart(kind: "topic")); f.setTopic("Spanish words"); f.setOpt { $0.lang = "es"; $0.audio = true }; f.make()
  check(await until { f.m.step == "review" }, "a make with audio cards ends in the review")
  let au = f.m.cards.filter { $0.kind == "audio" }
  check(au.count == 2 && au[0].speak == "la casa" && au[0].lang == "es-ES" && au[0].back == "the house" && au[0].front == "" && au[1].speak == "buenos días", "the audio cards have their words, language and meaning (\(au.map(\.speak)))")
  f.edit(au[0].key) { $0.speak = "la casa grande"; $0.back = "the big house" }
  f.save()
  check(await until { !spy.left.isEmpty }, "saving leaves the flow")
  saved = (await entries("/api/make/save")).last?["body"] as? [String: Any] ?? [:]
  let sentCards = saved["cards"] as? [[String: Any]] ?? []
  check(sentCards.count == 6 && sentCards.filter { $0["kind"] as? String == "audio" }.count == 2, "save sends every card (\(sentCards.count)), two of them audio")
  let a0 = sentCards.first { $0["kind"] as? String == "audio" } ?? [:]
  check(Set(a0.keys) == ["kind", "front", "back", "text", "at", "speak", "lang"] && a0["speak"] as? String == "la casa grande" && a0["lang"] as? String == "es-ES" && a0["back"] as? String == "the big house", "an audio card goes with what is said and its language, as edited")
  check(sentCards.filter { $0["kind"] as? String != "audio" }.allSatisfy { Set($0.keys) == ["kind", "front", "back", "text", "at"] }, "the other cards go as they always did (no speak or lang)")

  // ---------- what makes it ready, and what's asked for ----------
  f = newFlow("okay", spy); f.enter(MakeStart(kind: "topic"))
  f.setTopic("a"); check(!f.ready, "a topic of one letter isn't enough"); f.setTopic("ab"); check(f.ready, "two letters are")
  f.enter(MakeStart(kind: "paste")); f.setText(String(repeating: "x", count: 19)); check(!f.ready, "19 letters of text aren't enough"); f.setText(String(repeating: "x", count: 20)); check(f.ready, "20 are")
  f.setOpt { $0.count = 20; $0.lang = "es"; $0.deckId = "d1"; $0.basic = false }
  var body = f.sourceBody(), o = body["options"] as? [String: Any] ?? [:]
  check(body["kind"] as? String == "text" && body["text"] as? String == String(repeating: "x", count: 20) && body["title"] as? String == "", "pasted text is asked for as text, with its title")
  check(o["count"] as? Int == 20 && o["kinds"] as? [String] == ["cloze"] && o["lang"] as? String == "es" && o["deckId"] as? String == "d1", "with the number, the kinds, the language and the deck")
  f.setOpt { $0.cloze = false }
  check(f.m.opts.cloze && !f.m.opts.basic, "one kind of card always stays on")
  f.enter(MakeStart(kind: "video")); f.setUrl("  https://youtu.be/abcdefghijk \n")
  check(f.m.url == "https://youtu.be/abcdefghijk" && f.ready && f.sourceBody()["text"] == nil && f.sourceBody()["url"] as? String == "https://youtu.be/abcdefghijk", "a video's link (trimmed) is enough, and no transcript is sent")
  f.useTranscript(true); check(!f.ready, "a transcript's turn needs its words")
  f.setText(String(repeating: "t", count: 25)); check(f.ready && f.sourceBody()["text"] as? String == String(repeating: "t", count: 25), "and sends them")
  f.setUrl("https://example.com/video"); check(!f.ready, "a link that isn't YouTube's isn't ready")
  let off = newFlow("okay", spy, info: MakeInfo(on: true, video: false, perDay: 3, pages: 30, minutes: 15, photos: 10, fileMB: 20)); off.enter(MakeStart(kind: "video")); off.setUrl("https://youtu.be/abcdefghijk")
  check(off.usesTranscript && !off.ready, "a server that can't watch videos needs the transcript, without being asked to switch")
  off.setText(String(repeating: "t", count: 25)); check(off.ready && off.sourceBody()["text"] != nil, "and then sends it")
  for (kind, want) in [("photo", "photo"), ("record", "recording"), ("file", "file")] { f.enter(MakeStart(kind: kind)); check(f.sourceBody()["kind"] as? String == want, "a \(kind) is asked for as \(want)") }

  // ---------- opening it where a link says ----------
  f = newFlow("okay", spy); f.enter(MakeStart(kind: "voice"))
  check(f.m.step == "pick" && f.m.kind == "", "a kind it doesn't know opens the list")
  f.enter(MakeStart(kind: "photo", deckId: "d1")); check(f.m.step == "add" && f.m.kind == "photo" && f.m.opts.deckId == "d1", "a kind and a deck open that page, with that deck")
  let mats: (String) -> DeckMaterials? = { id in
    id == "d1" ? try? JSONDecoder().decode(DeckMaterials.self, from: Data(##"{"id":"d1","sources":[{"id":"x1","kind":"recording","name":"Lecture 4"}],"guide":{"text":"# Guide\n\nThe cell cycle has phases.","pages":[{"id":"g1","title":"Mnemonics","text":"PMAT for the phases of mitosis"}]}}"##.utf8)) : nil
  }
  f = newFlow("okay", spy, materials: mats)
  f.enter(MakeStart(deckId: "d1", from: "x1"))
  check(f.m.step == "add" && f.m.kind == "record" && f.m.from == MakeFrom(deckId: "d1", id: "x1", name: "Lecture 4", kind: "recording") && f.ready, "from=<a kept source> opens More cards for it (a recording is Record's kind)")
  check((f.sourceBody()["fromSource"] as? [String: Any])?["id"] as? String == "x1", "and asks for cards from that source")
  check((f.sourceBody()["options"] as? [String: Any])?["notes"] == nil, "without a word about notes (the server drafts none for more cards from a source)")
  f.enter(MakeStart(deckId: "d1", from: "nope")); check(f.m.step == "pick", "a source that isn't there opens the list")
  f.enter(MakeStart(guide: "d1")); check(f.m.step == "add" && f.m.kind == "paste" && f.m.text.hasPrefix("# Guide") && f.m.title == "Cell Biology Guide" && f.m.opts.deckId == "d1", "guide=<a deck> opens Paste with its Guide, going into that deck")
  f.enter(MakeStart(guide: "d1", page: "g1")); check(f.m.text == "PMAT for the phases of mitosis" && f.m.title == "Cell Biology: Mnemonics", "with a page, that page")
  f.enter(MakeStart(guide: "d2")); check(f.m.step == "pick", "a deck with no Guide opens the list")
  f.enter(MakeStart(text: "Words in hand, from a selection.", title: "A selection")); check(f.m.kind == "paste" && f.m.text.hasPrefix("Words in hand") && f.m.title == "A selection", "words in hand open Paste with them")

  // ---------- the recording's pieces ----------
  await post("/__reset")
  f = newFlow("okay", spy); f.enter(MakeStart(kind: "record"))
  check(f.recorder.state == .idle && !f.recorder.live && f.m.rec == .idle, "the recorder starts idle")
  f.recorder.stand = URL(fileURLWithPath: fixtures + "/tone3.m4a"); f.recorder.speed = 4
  f.recStart()
  check(await until(5) { f.m.rec == .recording }, "Start records (a file stands in for the microphone)")
  try? await Task.sleep(nanoseconds: 1_000_000_000)
  let s1 = f.recorder.secs
  check(s1 > 2.5 && s1 < 6.5 && !f.recorder.levels.isEmpty, "the time counts (\(String(format: "%.1f", s1)) s at 4 times the speed) and the meter moves")
  f.recPause(); check(await until(3) { f.m.rec == .paused }, "Pause pauses")
  let p1 = f.recorder.secs; try? await Task.sleep(nanoseconds: 700_000_000)
  check(f.recorder.secs == p1, "the time stands still while paused")
  f.recResume(); check(await until(3) { f.m.rec == .recording }, "Resume goes on")
  f.recDiscard(); check(await until(3) { f.m.rec == .idle } && f.recorder.secs == 0, "Discard throws it away")
  check((await entries("/api/make/upload")).isEmpty, "and nothing was sent")

  // ---------- a new file every ten minutes ----------
  check(MakeRecorder.fileSeconds == 600 && f.recorder.segmentSeconds == 600, "the recorder starts a new file every ten minutes")
  f = newFlow("okay", spy, info: .pro); f.enter(MakeStart(kind: "record"))
  f.recorder.stand = URL(fileURLWithPath: fixtures + "/tone3.m4a"); f.recorder.speed = 2000   // (a tick of a quarter second is 500 seconds)
  f.recStart()
  check(await until(5) { f.m.rec == .recording }, "a long lecture is recording")
  check(await until(20) { f.recorder.secs >= 1500 }, "more than twenty-five minutes of it have gone by")
  await f.recStop()
  let lengths = f.m.seconds
  check(lengths.count >= 3 && lengths.dropLast().allSatisfy { abs($0 - 600) < 0.01 } && (lengths.last ?? 0) > 0 && (lengths.last ?? 0) <= 600.01, "it is several files, none longer than ten minutes (\(lengths.map { Int($0) }))")
  check(f.m.files.count == lengths.count && f.m.files.map(\.name).first == "Recording 1.m4a" && f.m.files.allSatisfy { $0.fam == .audio && $0.parts.isEmpty }, "each is a file of its own, not cut again")
  f.cancel()
}

await run()
print("Make: \(passed) passed, \(failed) failed")
exit(failed == 0 ? 0 : 1)
