// Lucida Pro bought with Apple's in-app purchase (StoreKit 2). The App Store has two subscriptions, yearly and monthly
// (cards.lucida.pro.yearly and cards.lucida.pro.monthly, web/apple.mjs PRODUCTS); the prices are always the App Store's own
// (`displayPrice`), never written here. Buying uses the person's id as the purchase's appAccountToken (`me.appAccountToken`), so
// a purchase can't be moved to someone else, and the signed transaction goes to Lucida's server (POST /api/iap), which turns it
// into the same Pro the web has (web/billing.mjs); `StoreKit.Transaction.updates` sends renewals and purchases made elsewhere the same
// way. Nothing here unlocks Pro by itself: Pro comes from the server's answer (`me.plan`), like on the web.
import StoreKit
import SwiftUI

/// One way to pay for Pro, as the paywall shows it. The text comes from StoreKit's product (`displayPrice`, its period).
struct Offer: Identifiable, Equatable {
  /// "yearly" or "monthly".
  let id: String
  let productId: String
  /// The App Store's own price text ("$49.99") and how often it's paid ("a year").
  let price: String
  let per: String
  /// What the yearly price comes to a month, or that the monthly one can be cancelled ("That’s $4.17 a month, paid once a year.").
  let note: String
  /// "Save 30%" on the yearly price when it comes to less than twelve months of the monthly one.
  let save: String
  /// What a year comes to a month ("$4.17"), on the yearly offer.
  var month = ""
}

@MainActor
final class Shop: ObservableObject {
  static let ids = ["yearly": "cards.lucida.pro.yearly", "monthly": "cards.lucida.pro.monthly"]
  /// Where the App Store's offers stand: being asked for, here, not there (the subscriptions aren't approved yet, or aren't
  /// set up), or couldn't be asked for (no connection).
  enum Catalog: Equatable { case loading, ready, unavailable, failed }

  @Published private(set) var catalog = Catalog.loading
  @Published private(set) var offers: [Offer] = []
  /// The way to pay that's picked on the paywall: "yearly" or "monthly".
  @Published var pick = "yearly"
  /// What's under way: "buy", "restore", or "".
  @Published private(set) var busy = ""
  /// Plain words under the buttons: what went wrong, or what is waiting.
  @Published private(set) var line = ""
  @Published private(set) var lineIsError = false
  /// Pro is on (the server said so after a purchase or a restore); the paywall closes.
  @Published private(set) var done = false
  /// What the yearly price comes to, for the upgrade cards ("Yearly works out to $4.17 a month. Cancel anytime."): nothing until the
  /// App Store has said what it costs, so a card never shows a price Lucida wrote itself.
  var yearlyLine: String { offers.first { $0.id == "yearly" }.map { $0.month.isEmpty ? "" : "Yearly works out to \($0.month) a month. Cancel anytime." } ?? "" }

  private var products: [String: Product] = [:]
  private weak var store: Store?
  private var listener: Task<Void, Never>?

  init(store: Store) { self.store = store }

  // ---------- what the App Store offers ----------
  func load(again: Bool = false) async {
    guard let store, !store.demo else { return }
    if catalog == .ready && !again { return }
    catalog = .loading
    do {
      let found = try await Product.products(for: Array(Shop.ids.values))
      products = Dictionary(uniqueKeysWithValues: found.map { ($0.id, $0) })
      offers = makeOffers()
      catalog = offers.isEmpty ? .unavailable : .ready
      if !offers.contains(where: { $0.id == pick }), let first = offers.first { pick = first.id }
    } catch {
      catalog = .failed
    }
  }

  private func makeOffers() -> [Offer] {
    let y = products[Shop.ids["yearly"]!], m = products[Shop.ids["monthly"]!]
    var out: [Offer] = []
    if let y {
      // What a year comes to a month, in the App Store's own money format.
      let month = (y.price / 12).formatted(y.priceFormatStyle)
      var save = ""
      if let m, m.price > 0 {
        let off = NSDecimalNumber(decimal: (1 - y.price / (m.price * 12)) * 100).doubleValue
        if off >= 1 { save = "Save \(Int(off.rounded(.down)))%" }
      }
      out.append(Offer(id: "yearly", productId: y.id, price: y.displayPrice, per: Shop.per(y), note: "That’s \(month) a month, paid once a year.", save: save, month: month))
    }
    if let m { out.append(Offer(id: "monthly", productId: m.id, price: m.displayPrice, per: Shop.per(m), note: "Paid monthly. Cancel anytime.", save: "")) }
    return out
  }
  /// "a year" or "a month", from the subscription's own period.
  private static func per(_ p: Product) -> String {
    switch p.subscription?.subscriptionPeriod.unit {
    case .year?: return "a year"
    case .week?: return "a week"
    case .day?: return "a day"
    default: return "a month"
    }
  }

  // ---------- buying ----------
  /// Buys the picked plan. True when Pro is on (the server has the purchase and says so).
  @discardableResult
  func buy() async -> Bool {
    guard busy.isEmpty, let store, !store.demo, let id = Shop.ids[pick], let product = products[id] else { return false }
    busy = "buy"; say(""); done = false
    defer { busy = "" }
    var options: Set<Product.PurchaseOption> = []
    if let token = UUID(uuidString: store.lib.me?.appAccountToken ?? "") { options.insert(.appAccountToken(token)) }
    do {
      switch try await product.purchase(options: options) {
      case .success(let verified):
        guard case .verified(let transaction) = verified else { say("That purchase couldn’t be checked."); return false }
        do { try await store.sendPurchases([verified.jwsRepresentation]) }
        catch APIError.signedOut { store.phase = .signedOut; return false }
        catch APIError.server(let words) where words != API.unreachable {
          // Lucida says no (this purchase is someone else's, say): the words are shown, and the purchase waits.
          say(words); return false
        }
        catch { say("Your purchase went through, but Pro isn’t on yet. Tap Restore purchases."); return false }
        await transaction.finish()
        done = true
        return true
      case .pending:
        say("Waiting for approval. Pro turns on when you get it.", error: false)
      case .userCancelled:
        break
      @unknown default:
        say("That didn’t go through. Try again.")
      }
    } catch {
      say("That didn’t go through. Try again.")
    }
    return false
  }

  /// Restore purchases: asks the App Store for what this Apple Account has bought, and tells Lucida about it.
  @discardableResult
  func restore() async -> Bool {
    guard busy.isEmpty, let store, !store.demo else { return false }
    busy = "restore"; say(""); done = false
    defer { busy = "" }
    do { try await AppStore.sync() } catch { /* closing the sign-in is fine: what's on this phone still counts */ }
    let list = await mine(unfinished: false)
    guard !list.isEmpty else { say("There’s nothing to restore."); return false }
    do { try await store.sendPurchases(list.map(\.jws)) }
    catch APIError.signedOut { store.phase = .signedOut; return false }
    catch APIError.server(let words) where words != API.unreachable { say(words); return false }
    catch { say("Couldn’t restore your purchases. Try again."); return false }
    for t in list { await t.transaction.finish() }
    done = true
    return true
  }

  /// A purchase's signed transaction, and the transaction itself (to finish once Lucida has it).
  struct Held { let jws: String; let transaction: StoreKit.Transaction }

  /// What this phone holds that is Lucida Pro and this person's: the plans that are on now, and (when asked) purchases that
  /// haven't been finished yet (the app was closed before Lucida heard about them).
  private func mine(unfinished: Bool) async -> [Held] {
    guard let store else { return [] }
    let token = UUID(uuidString: store.lib.me?.appAccountToken ?? "")
    var out: [Held] = []
    func keep(_ r: VerificationResult<StoreKit.Transaction>) {
      guard case .verified(let t) = r, Shop.ids.values.contains(t.productID), t.revocationDate == nil else { return }
      // A purchase made by someone else's Lucida account stays theirs; one without a token (an offer code) goes to whoever sends it.
      guard t.appAccountToken == nil || t.appAccountToken == token else { return }
      if !out.contains(where: { $0.transaction.id == t.id }) { out.append(Held(jws: r.jwsRepresentation, transaction: t)) }
    }
    for await r in StoreKit.Transaction.currentEntitlements { keep(r) }
    if unfinished { for await r in StoreKit.Transaction.unfinished { keep(r) } }
    // The newest ten (the server takes ten at a time).
    return Array(out.sorted { $0.transaction.purchaseDate > $1.transaction.purchaseDate }.prefix(10))
  }

  // ---------- what happens outside the paywall ----------
  /// Listens for purchases made elsewhere (a renewal, an approved request, another phone), and any that were left unfinished
  /// the last time. Each goes to Lucida's server; one that can't be sent stays unfinished, and comes again next time.
  func listen() {
    guard listener == nil, let store, !store.demo else { return }
    listener = Task { [weak self] in
      for await result in StoreKit.Transaction.updates {
        guard let self else { return }
        await self.take(result)
      }
    }
  }
  private func take(_ result: VerificationResult<StoreKit.Transaction>) async {
    guard looksByItself, let store, store.phase == .ready, case .verified(let t) = result, Shop.ids.values.contains(t.productID) else { return }
    let token = UUID(uuidString: store.lib.me?.appAccountToken ?? "")
    guard t.appAccountToken == nil || t.appAccountToken == token else { return }
    do { try await store.sendPurchases([result.jwsRepresentation]); await t.finish() }
    catch { /* it stays unfinished and comes again */ }
  }
  /// The app doesn't look for purchases by itself (only Restore purchases and Go Pro do): the tests turn it off with
  /// `-noPurchaseSync` to try Restore on its own. Always off in a release build.
  private var looksByItself: Bool {
    #if DEBUG
    return !ProcessInfo.processInfo.arguments.contains("-noPurchaseSync")
    #else
    return true
    #endif
  }
  /// After signing in (and when the app opens): purchases this phone holds that Lucida doesn't have yet. Quiet; nothing shows.
  func catchUp() async {
    guard looksByItself, let store, !store.demo, store.phase == .ready, !store.plan.pro else { return }
    let list = await mine(unfinished: true)
    guard !list.isEmpty, (try? await store.sendPurchases(list.map(\.jws))) != nil else { return }
    for t in list { await t.transaction.finish() }
  }

  /// Starts a purchase fresh: nothing said, nothing under way.
  func reset() { say(""); done = false }

  private func say(_ words: String, error: Bool = true) { line = words; lineIsError = error }
}

extension Store {
  /// A purchase's signed transactions go to the server (POST /api/iap); then the library is asked for again, so `me.plan` is what
  /// the server says it is now.
  func sendPurchases(_ signed: [String]) async throws {
    guard !demo, !signed.isEmpty else { return }
    try await api.iap(signed)
    if let next = try? await api.state() { accept(next) }
    netDrop()
    objectWillChange.send()
  }
}
