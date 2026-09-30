// Debug builds only: sign in as a made-up person on a local test server (`-dev <name>`, like the web's /dev/as/<name>).
// The server gives each one a library of their own, and names that start with "free" are on the Free plan.
import Foundation

enum DevSignIn {
  #if DEBUG
  /// Sets the server's lc_dev cookie for the test server this app is pointed at (`-server`). `-dev none` forgets it instead:
  /// nobody in particular (the local server's own person), whoever an earlier run on this simulator was signed in as.
  static func apply() {
    guard let name = Board.arg("-dev"), let host = API.base.host else { return }
    if name == "none" { for c in HTTPCookieStorage.shared.cookies ?? [] where c.name == "lc_dev" { HTTPCookieStorage.shared.deleteCookie(c) }; return }
    guard let c = HTTPCookie(properties: [.domain: host, .path: "/", .name: "lc_dev", .value: name]) else { return }
    HTTPCookieStorage.shared.setCookie(c)
  }
  #else
  static func apply() {}
  #endif
}
