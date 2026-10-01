// Debug builds in the simulator: `-storekit <file>` turns on StoreKit's local test store for this app (the same store Xcode's
// StoreKit configuration uses, with the same file, Lucida.storekit), so Pro can be bought and restored without the App Store.
// The UI tests do this (StoreTests.swift). Apple's StoreKitTest only runs inside a test, and a UI test runs in another
// process that the test store won't take orders from, so the app starts its own session, loading the framework by hand from
// the simulator's own folder. The test runner has to hand the app the folder of the test frameworks too (DYLD_FRAMEWORK_PATH,
// which Xcode's own test runs have and the UI test passes on): the session looks XCTest up there. Without all that, or on a
// device or in a Release build, nothing here exists or does anything.
//   -storekit <file>            the products in that file, with the purchases from before kept
//   -storekitReset              ... after clearing what was bought
//   -storekitBuy <product id>   buys that product right away, as an Apple Account would elsewhere (no Lucida account on it)
// The store only talks to an app entitled as a development build, which is why Debug builds carry get-task-allow
// (LucidaDebug.entitlements).
#if DEBUG && targetEnvironment(simulator)
import Foundation

enum StoreKitTesting {
  /// The session lives as long as the app does: when it goes, so does the test store.
  nonisolated(unsafe) private static var session: NSObject?

  static func startIfAsked() {
    guard let path = Board.arg("-storekit") else { return }
    guard dlopen("/Developer/Library/Frameworks/StoreKitTest.framework/StoreKitTest", RTLD_NOW) != nil,
          let cls = NSClassFromString("SKTestSession") as? NSObject.Type,
          let raw = cls.perform(NSSelectorFromString("alloc"))?.takeUnretainedValue(),
          let made = raw.perform(NSSelectorFromString("initWithContentsOfURL:error:"), with: URL(fileURLWithPath: path) as NSURL, with: nil)?.takeUnretainedValue() as? NSObject
    else { print("STOREKIT the test store didn’t start (the launcher has to give the app DYLD_FRAMEWORK_PATH: the platform’s Developer/Library/Frameworks)"); return }
    session = made
    made.setValue(true, forKey: "disableDialogs")
    let args = ProcessInfo.processInfo.arguments
    if args.contains("-storekitReset") {
      _ = made.perform(NSSelectorFromString("resetToDefaultState"))
      made.setValue(true, forKey: "disableDialogs")
      _ = made.perform(NSSelectorFromString("clearTransactions"))
    }
    if let i = args.firstIndex(of: "-storekitBuy"), i + 1 < args.count {
      _ = made.perform(NSSelectorFromString("buyProductWithIdentifier:error:"), with: args[i + 1] as NSString, with: nil)
    }
    print("STOREKIT the test store is on")
  }
}
#endif
