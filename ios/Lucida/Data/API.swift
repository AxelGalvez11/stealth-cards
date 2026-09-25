// Lucida's server (the same one the web app uses): /api/state, /api/action, /api/rev, and signing in with an email
// code. The session lives in cookies the server sets (lc_at, lc_rt); URLSession keeps them like a browser would.
import Foundation

enum APIError: LocalizedError {
  case signedOut, server(String)
  var errorDescription: String? {
    switch self { case .signedOut: return "Sign in to Lucida."; case .server(let m): return m }
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
  private let session: URLSession = {
    let c = URLSessionConfiguration.default
    c.httpCookieStorage = .shared; c.httpShouldSetCookies = true; c.httpCookieAcceptPolicy = .always
    c.requestCachePolicy = .reloadIgnoringLocalCacheData
    return URLSession(configuration: c)
  }()

  /// Going Pro on the server's own site (Stripe's checkout), paying "monthly" or "yearly".
  static func pro(_ plan: String) -> URL {
    var u = URLComponents(url: base.appendingPathComponent("pro"), resolvingAgainstBaseURL: false)!
    u.queryItems = [URLQueryItem(name: "plan", value: plan)]
    return u.url!
  }
  /// The plans side by side, Monthly or Yearly.
  static let pricing = URL(string: "https://lucida.cards/pricing")!

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

  func sendCode(_ email: String) async throws { _ = try await request("api/auth/code", method: "POST", json: ["email": email]) }
  func verify(_ email: String, _ code: String) async throws { _ = try await request("api/auth/verify", method: "POST", json: ["email": email, "code": code]) }
  func signOut() async { _ = try? await request("api/auth/signout", method: "POST", json: [:]) }
  /// Apple's or Google's ID token and the nonce it was made for (see SignInProviders.swift); the session's cookies come back.
  func idToken(_ provider: String, _ token: String, nonce: String, name: String) async throws {
    _ = try await request("api/auth/token", method: "POST", json: ["provider": provider, "token": token, "nonce": nonce, "name": name])
  }

  /// Uploads a picture or a recording to your library's storage and returns its link (/media/…).
  func upload(_ data: Data, type: String) async throws -> String {
    var r = URLRequest(url: API.base.appendingPathComponent("api/media"))
    r.httpMethod = "POST"; r.setValue(type, forHTTPHeaderField: "content-type"); r.httpBody = data
    let (body, resp) = try await session.data(for: r)
    guard let http = resp as? HTTPURLResponse else { throw APIError.server("That didn’t upload.") }
    if http.statusCode == 401 { throw APIError.signedOut }
    let j = (try? JSONSerialization.jsonObject(with: body)) as? [String: Any]
    guard (200..<300).contains(http.statusCode), let url = j?["url"] as? String else { throw APIError.server(j?["error"] as? String ?? "That didn’t upload.") }
    return url
  }

  /// Pictures and sound: /media/… answers with a short-lived link to the file.
  func mediaURL(_ path: String) -> URL? { path.hasPrefix("http") ? URL(string: path) : URL(string: path, relativeTo: API.base)?.absoluteURL }
}
