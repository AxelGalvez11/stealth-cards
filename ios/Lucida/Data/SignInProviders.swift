// Signing in with Apple and Google on the iPhone. Each gives an ID token (a signed note saying who you are) made for a
// random nonce; the app sends both to Lucida's server (/api/auth/token), which has Supabase check them and sets the
// session cookies, like the website's sign-in (web/handler.mjs). No secrets live in the app: these IDs are public.
import AuthenticationServices
import CryptoKit
import UIKit

enum Nonce {
  /// A random string of URL-safe letters (32 bytes of randomness).
  static func make() -> String {
    var b = [UInt8](repeating: 0, count: 32)
    _ = SecRandomCopyBytes(kSecRandomDefault, b.count, &b)
    return base64url(Data(b))
  }
  static func sha256Hex(_ s: String) -> String { SHA256.hash(data: Data(s.utf8)).map { String(format: "%02x", $0) }.joined() }
  static func base64url(_ d: Data) -> String {
    d.base64EncodedString().replacingOccurrences(of: "+", with: "-").replacingOccurrences(of: "/", with: "_").replacingOccurrences(of: "=", with: "")
  }
}

private var keyWindow: UIWindow {
  UIApplication.shared.connectedScenes.compactMap { ($0 as? UIWindowScene)?.keyWindow }.first ?? UIWindow()
}

/// Sign in with Apple: Apple's own sheet (Face ID or the Apple Account password). Apple gives the name only the first
/// time, so it's sent along to be saved.
@MainActor
final class AppleSignIn: NSObject, ASAuthorizationControllerDelegate, ASAuthorizationControllerPresentationContextProviding {
  struct Result { let token: String; let nonce: String; let name: String }
  private var waiting: CheckedContinuation<ASAuthorization, Error>?
  private var controller: ASAuthorizationController?

  func run() async throws -> Result {
    let nonce = Nonce.make()
    let a: ASAuthorization = try await withCheckedThrowingContinuation { k in
      waiting = k
      let r = ASAuthorizationAppleIDProvider().createRequest()
      r.requestedScopes = [.fullName, .email]
      r.nonce = Nonce.sha256Hex(nonce)
      let c = ASAuthorizationController(authorizationRequests: [r])
      c.delegate = self; c.presentationContextProvider = self
      controller = c
      c.performRequests()
    }
    guard let cred = a.credential as? ASAuthorizationAppleIDCredential, let t = cred.identityToken, let token = String(data: t, encoding: .utf8)
    else { throw APIError.server("That didn’t work. Try again.") }
    let name = [cred.fullName?.givenName, cred.fullName?.familyName].compactMap { $0 }.joined(separator: " ")
    return Result(token: token, nonce: nonce, name: name)
  }

  nonisolated func authorizationController(controller: ASAuthorizationController, didCompleteWithAuthorization a: ASAuthorization) {
    MainActor.assumeIsolated { waiting?.resume(returning: a); waiting = nil; self.controller = nil }
  }
  nonisolated func authorizationController(controller: ASAuthorizationController, didCompleteWithError e: Error) {
    MainActor.assumeIsolated { waiting?.resume(throwing: e); waiting = nil; self.controller = nil }
  }
  nonisolated func presentationAnchor(for controller: ASAuthorizationController) -> ASPresentationAnchor { MainActor.assumeIsolated { keyWindow } }
}

/// Google: its sign-in page in a sheet (ASWebAuthenticationSession), for Lucida's iPhone client in the Google Cloud
/// project "Lucida". The page answers with a one-time code for this app's own address, which the app trades (with the
/// PKCE verifier only it knows) for Google's ID token. Installed apps have no client secret.
@MainActor
final class GoogleSignIn: NSObject, ASWebAuthenticationPresentationContextProviding {
  static let clientID = "274372639474-gadqr944qbl9nn6tp4bb25p37f2hqkfc.apps.googleusercontent.com"
  /// Google's address for an iPhone client: its ID turned around, as a URL scheme.
  static let scheme = "com.googleusercontent.apps." + clientID.replacingOccurrences(of: ".apps.googleusercontent.com", with: "")
  static let redirect = scheme + ":/oauth2redirect"
  struct Result { let token: String; let nonce: String }
  private var session: ASWebAuthenticationSession?

  func run() async throws -> Result {
    let verifier = Nonce.make(), nonce = Nonce.make(), state = Nonce.make()
    var u = URLComponents(string: "https://accounts.google.com/o/oauth2/v2/auth")!
    u.queryItems = [
      .init(name: "client_id", value: Self.clientID), .init(name: "redirect_uri", value: Self.redirect),
      .init(name: "response_type", value: "code"), .init(name: "scope", value: "openid email profile"),
      .init(name: "code_challenge", value: Nonce.base64url(Data(SHA256.hash(data: Data(verifier.utf8))))), .init(name: "code_challenge_method", value: "S256"),
      .init(name: "nonce", value: Nonce.sha256Hex(nonce)), .init(name: "state", value: state), .init(name: "prompt", value: "select_account")
    ]
    let back: URL = try await withCheckedThrowingContinuation { k in
      let s = ASWebAuthenticationSession(url: u.url!, callbackURLScheme: Self.scheme) { url, error in
        if let url { k.resume(returning: url) } else { k.resume(throwing: error ?? APIError.server("That didn’t work. Try again.")) }
      }
      s.presentationContextProvider = self
      session = s
      s.start()
    }
    session = nil
    let q = URLComponents(url: back, resolvingAgainstBaseURL: false)?.queryItems ?? []
    guard q.first(where: { $0.name == "state" })?.value == state, let code = q.first(where: { $0.name == "code" })?.value
    else { throw APIError.server("That didn’t work. Try again.") }
    // Trade the code for the tokens.
    var r = URLRequest(url: URL(string: "https://oauth2.googleapis.com/token")!)
    r.httpMethod = "POST"
    r.setValue("application/x-www-form-urlencoded", forHTTPHeaderField: "content-type")
    var form = URLComponents()
    form.queryItems = [.init(name: "code", value: code), .init(name: "client_id", value: Self.clientID), .init(name: "redirect_uri", value: Self.redirect),
                       .init(name: "grant_type", value: "authorization_code"), .init(name: "code_verifier", value: verifier)]
    r.httpBody = Data((form.percentEncodedQuery ?? "").utf8)
    let (data, _) = try await URLSession.shared.data(for: r)
    guard let token = (try? JSONSerialization.jsonObject(with: data) as? [String: Any])?["id_token"] as? String
    else { throw APIError.server("That didn’t work. Try again.") }
    return Result(token: token, nonce: nonce)
  }

  nonisolated func presentationAnchor(for session: ASWebAuthenticationSession) -> ASPresentationAnchor { MainActor.assumeIsolated { keyWindow } }
}

extension Store {
  /// Signs in with Apple or Google, then loads your library. Nil when it worked; "" when you closed the sheet (nothing
  /// to say); otherwise what went wrong.
  func signIn(with provider: String) async -> String? {
    guard !demo else { return nil }
    do {
      if provider == "apple" {
        let r = try await AppleSignIn().run()
        try await api.idToken("apple", r.token, nonce: r.nonce, name: r.name)
      } else {
        let r = try await GoogleSignIn().run()
        try await api.idToken("google", r.token, nonce: r.nonce, name: "")
      }
      await load()
      return nil
    } catch let e as ASAuthorizationError where e.code == .canceled {
      return ""
    } catch let e as ASWebAuthenticationSessionError where e.code == .canceledLogin {
      return ""
    } catch {
      return error.localizedDescription
    }
  }
}
