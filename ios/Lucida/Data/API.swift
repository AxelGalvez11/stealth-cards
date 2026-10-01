// Lucida's server (the same one the web app uses): /api/state, /api/action, /api/rev, and signing in with an email
// code. The session lives in cookies the server sets (lc_at, lc_rt); URLSession keeps them like a browser would.
import Foundation

enum APIError: LocalizedError {
  case signedOut, server(String)
  var errorDescription: String? {
    switch self { case .signedOut: return "Sign in to Lucida."; case .server(let m): return API.plain(m) }
  }
}

final class API {
  /// Lucida's server. In a debug build, `-server <url>` uses another copy (like one running on this Mac).
  static let base: URL = {
    #if DEBUG
    let a = ProcessInfo.processInfo.arguments
    if let i = a.firstIndex(of: "-server"), i + 1 < a.count, let u = URL(string: a[i + 1]) { return u }
    #endif
    return URL(string: "https://app.lucida.cards")!
  }()
  /// The server's own words, for the phone. Some of them send people to the pricing page to go Pro, which is the web's way: on iPhone
  /// Pro is bought in the app (Go Pro), so the page isn't named. ("Exam dates are part of Lucida Pro: <the page>" says "Exam dates are
  /// part of Lucida Pro.")
  static func plain(_ words: String) -> String {
    var w = words
    for (pattern, with) in [(#"\s+Go Pro at lucida\.cards/pricing\.?"#, ""), (#":\s*lucida\.cards/pricing\.?"#, "."), (#"\s*lucida\.cards/pricing"#, "")] {
      w = w.replacingOccurrences(of: pattern, with: with, options: .regularExpression)
    }
    return w
  }
  private let session: URLSession = {
    let c = URLSessionConfiguration.default
    c.httpCookieStorage = .shared; c.httpShouldSetCookies = true; c.httpCookieAcceptPolicy = .always
    c.requestCachePolicy = .reloadIgnoringLocalCacheData
    return URLSession(configuration: c)
  }()

  /// A request and its answer, whatever the status (only a signed-out session throws).
  private func raw(_ path: String, method: String = "GET", json: [String: Any]? = nil) async throws -> (Data, HTTPURLResponse) {
    var r = URLRequest(url: API.base.appendingPathComponent(path))
    r.httpMethod = method
    r.setValue("application/json", forHTTPHeaderField: "accept")
    if let json { r.setValue("application/json", forHTTPHeaderField: "content-type"); r.httpBody = try JSONSerialization.data(withJSONObject: json) }
    let (data, resp) = try await session.data(for: r)
    guard let http = resp as? HTTPURLResponse else { throw APIError.server("That didn’t work. Try again in a minute.") }
    if http.statusCode == 401 { throw APIError.signedOut }
    return (data, http)
  }

  private func request(_ path: String, method: String = "GET", json: [String: Any]? = nil) async throws -> (Data, HTTPURLResponse) {
    let (data, http) = try await raw(path, method: method, json: json)
    if !(200..<300).contains(http.statusCode) {
      let msg = (try? JSONSerialization.jsonObject(with: data) as? [String: Any])?["error"] as? String
      throw APIError.server(msg ?? "That didn’t work. Try again in a minute.")
    }
    return (data, http)
  }

  func state() async throws -> Library { try JSONDecoder().decode(Library.self, from: try await request("api/state").0) }
  /// How long the app waits for decks you study to be brought up to date before it opens without that (web/db.js SYNC_WAIT).
  static let syncWait: TimeInterval = 8
  /// The library after decks you study from other people take their owners' newest changes (the app's first look, and
  /// coming back after a while away, like the web app). That must never keep the app from opening (web/db.js readState):
  /// if asking for the sync fails or takes longer than `syncWait` seconds, the library comes without it (the app checks
  /// again every few seconds, so whatever the server finishes later still arrives). Signed out (a 401) still means signed out.
  func syncedState() async throws -> Library {
    do {
      let (status, data) = try await within(API.syncWait) { try await self.get("api/state?sync=1") }
      if (200..<300).contains(status), let lib = try? JSONDecoder().decode(Library.self, from: data) { return lib }
    } catch APIError.signedOut {
      throw APIError.signedOut
    } catch {
      // Too slow, or the connection dropped: without the sync, then.
    }
    return try await state()
  }
  /// `work`, given up on (and cancelled) once `seconds` have passed: the whole answer must be here by then, however it
  /// arrives (the web's AbortController timer; a request's own timeout only counts the quiet stretches).
  private func within<T>(_ seconds: TimeInterval, _ work: @escaping () async throws -> T) async throws -> T {
    try await withThrowingTaskGroup(of: T.self) { group in
      group.addTask { try await work() }
      group.addTask { try await Task.sleep(nanoseconds: UInt64(seconds * 1_000_000_000)); throw URLError(.timedOut) }
      defer { group.cancelAll() }
      return try await group.next()!
    }
  }

  // ---------- the study network (web/net.js) ----------
  /// A page's answer (`path` may have a query): its status and body, whatever the status.
  func get(_ path: String) async throws -> (status: Int, data: Data) {
    var r = URLRequest(url: URL(string: path, relativeTo: API.base)!.absoluteURL)
    r.setValue("application/json", forHTTPHeaderField: "accept")
    let (data, resp) = try await session.data(for: r)
    guard let http = resp as? HTTPURLResponse else { throw APIError.server(API.unreachable) }
    if http.statusCode == 401 { throw APIError.signedOut }
    return (http.statusCode, data)
  }
  /// A change on the network (/api/social): what it made, and your library after it.
  func social(_ type: String, _ payload: [String: Any]) async throws -> (result: [String: Any], state: Library?) {
    var body = payload; body["type"] = type
    let data: Data, http: HTTPURLResponse
    do { (data, http) = try await raw("api/social", method: "POST", json: body) }
    catch APIError.signedOut { throw APIError.signedOut }
    catch { throw APIError.server(API.unreachable) }
    let j = (try? JSONSerialization.jsonObject(with: data)) as? [String: Any]
    guard (200..<300).contains(http.statusCode) else { throw APIError.server(j?["error"] as? String ?? "Something went wrong. Try again.") }
    struct Reply: Decodable { let state: Library? }
    return (j?["result"] as? [String: Any] ?? [:], (try? JSONDecoder().decode(Reply.self, from: data))?.state)
  }
  static let unreachable = "Couldn’t reach Lucida. Check your connection."
  func rev() async throws -> Int { ((try JSONSerialization.jsonObject(with: try await request("api/rev").0) as? [String: Any])?["rev"] as? Int) ?? 0 }

  /// One change (web/store.mjs apply): returns what it made and the library after it.
  func action(_ type: String, _ payload: [String: Any]) async throws -> (result: [String: Any], state: Library) {
    var body = payload; body["type"] = type
    let data = try await request("api/action", method: "POST", json: body).0
    struct Reply: Decodable { let state: Library }
    let state = try JSONDecoder().decode(Reply.self, from: data).state
    let result = ((try? JSONSerialization.jsonObject(with: data)) as? [String: Any])?["result"] as? [String: Any] ?? [:]
    return (result, state)
  }

  /// Asks Lucida's AI to explain a card's answer (`question`: how Learn mode asked it, if it did). 200 has the text (and
  /// on Free, how many are left today); 402 is past today's free ones (`pro`: Pro would help); anything else, an error.
  func explain(_ cardId: String, question: String) async throws -> (status: Int, body: [String: Any]) {
    let (data, http) = try await raw("api/explain", method: "POST", json: ["cardId": cardId, "question": question])
    return (http.statusCode, (try? JSONSerialization.jsonObject(with: data)) as? [String: Any] ?? [:])
  }

  /// Signed transactions from StoreKit (Pro bought with the App Store), for the person who is signed in (web/handler.mjs
  /// iapReq). The server's own words come back as the error when it won't take one.
  func iap(_ signed: [String]) async throws {
    let body: [String: Any] = signed.count == 1 ? ["signedTransaction": signed[0]] : ["signedTransactions": signed]
    do { _ = try await request("api/iap", method: "POST", json: body) }
    catch let e as APIError { throw e }
    catch { throw APIError.server(API.unreachable) }
  }

  func sendCode(_ email: String) async throws { _ = try await request("api/auth/code", method: "POST", json: ["email": email]) }
  func verify(_ email: String, _ code: String) async throws { _ = try await request("api/auth/verify", method: "POST", json: ["email": email, "code": code]) }
  func signOut() async { _ = try? await request("api/auth/signout", method: "POST", json: [:]) }
  /// Apple's or Google's ID token and the nonce it was made for (see SignInProviders.swift); the session's cookies come back.
  func idToken(_ provider: String, _ token: String, nonce: String, name: String) async throws {
    _ = try await request("api/auth/token", method: "POST", json: ["provider": provider, "token": token, "nonce": nonce, "name": name])
  }

  /// Uploads a picture or a recording to your library's storage and returns its link (/media/…). A file over 4 MB is
  /// turned away first (online nothing over 4.5 MB gets through), with a plain message, like the web app.
  func upload(_ data: Data, type: String) async throws -> String {
    guard data.count <= Upload.limit else { throw APIError.server(Upload.over) }
    var r = URLRequest(url: API.base.appendingPathComponent("api/media"))
    r.httpMethod = "POST"; r.setValue(type, forHTTPHeaderField: "content-type"); r.httpBody = data
    let body: Data, resp: URLResponse
    do { (body, resp) = try await session.data(for: r) }
    catch { throw APIError.server("Couldn’t reach Lucida. Check your connection and try again.") }
    guard let http = resp as? HTTPURLResponse else { throw APIError.server("That didn’t upload. Try again in a minute.") }
    if http.statusCode == 401 { throw APIError.signedOut }
    // An error from the host itself (like a file that's too big for it) is a page, not JSON.
    let j = (try? JSONSerialization.jsonObject(with: body)) as? [String: Any]
    guard (200..<300).contains(http.statusCode), let url = j?["url"] as? String else {
      throw APIError.server(http.statusCode == 413 ? Upload.over : j?["error"] as? String ?? "That didn’t upload. Try again in a minute.")
    }
    return url
  }

  /// Pictures and sound: /media/… answers with a short-lived link to the file.
  func mediaURL(_ path: String) -> URL? { API.media(path) }
  static func media(_ path: String) -> URL? { path.hasPrefix("http") ? URL(string: path) : URL(string: path, relativeTo: API.base)?.absoluteURL }
}
