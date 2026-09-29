// Debug builds only: sign in as a made-up person on a local test server (`-dev <name>`, like the web's /dev/as/<name>).
// The server gives each one a library of their own, and names that start with "free" are on the Free plan.
import Foundation

enum DevSignIn {
  #if DEBUG
  /// Sets the server's lc_dev cookie for the test server this app is pointed at (`-server`).
  static func apply() {
    guard let name = Board.arg("-dev"), let host = API.base.host, let c = HTTPCookie(properties: [.domain: host, .path: "/", .name: "lc_dev", .value: name]) else { return }
    HTTPCookieStorage.shared.setCookie(c)
  }
  #else
  static func apply() {}
  #endif
}
