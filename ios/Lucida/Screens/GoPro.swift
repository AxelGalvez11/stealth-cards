// iPhone · Go Pro (PhoneGoPro, PhoneGoProSoon): the paywall. Every Go Pro in the app opens this sheet over the page you're on:
// Lucida Pro from the App Store, yearly or monthly (the prices are the App Store's own, never written here), the pricing page's
// Pro list, Restore purchases, and what Apple wants a subscription to say (how it renews, and where to cancel it). Someone who is
// Pro already sees how, and nothing to buy: Pro bought on the web is "Billed on the web", with no link and no button to buy.
import SwiftUI

/// What the paywall shows now.
struct GoProVM {
  /// Priced: the offers (a way to pay picked); loading them; none there yet (the subscriptions aren't on the App Store);
  /// couldn't ask; or Pro already.
  enum Kind { case priced, loading, soon, offline, pro }
  var kind = Kind.priced
  var offers: [Offer] = []
  var pick = "yearly"
  /// Going Pro or restoring, under way: "buy", "restore", or "".
  var busy = ""
  /// Plain words under the card: what went wrong, or what is waiting.
  var line = "", lineIsError = true
  var proLine = ""
  var offer: Offer? { offers.first { $0.id == pick } ?? offers.first }
}

extension Plan {
  /// "Yearly · renews September 24, 2027 · Billed by Apple": Settings' plan line, and the paywall's for someone who's Pro already.
  /// `web` says where it's billed when it isn't Apple (the iPhone app never opens Stripe, so it just says so).
  func line(web: Bool) -> String {
    let every = ["month": "Monthly", "year": "Yearly"][every] ?? ""
    let iso = ISO8601DateFormatter(), frac = ISO8601DateFormatter()
    frac.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
    var day = ""
    if let d = iso.date(from: until) ?? frac.date(from: until) {
      let f = DateFormatter(); f.locale = Locale(identifier: "en_US"); f.dateFormat = "MMMM d, yyyy"; f.timeZone = TimeZone(identifier: "UTC")
      day = (ending ? "ends " : "renews ") + f.string(from: d)
    }
    return [every, day, by == "apple" ? "Billed by Apple" : web ? "Billed on the web" : ""].filter { !$0.isEmpty }.joined(separator: " · ")
  }
}

extension Store {
  /// Whether Settings' plan has Manage plan and Cancel Pro: for a plan billed by Apple, which the system's own subscriptions
  /// screen manages. Pro bought on the web has none here (the app never opens Stripe's pages).
  var plansManage: Bool { demo ? props.plan != "Pro, billed on the web" : plan.pro && plan.by == "apple" }
  /// Where Settings' Pro plan says it's billed on the web (not Apple's).
  var plansWeb: Bool { demo ? props.plan == "Pro, billed on the web" : plan.pro && plan.by != "apple" }

  func goProVM() -> GoProVM {
    if demo {
      // The canvas's sample prices; the board's state (Tweak) says where the paywall stands.
      let offers = [Offer(id: "yearly", productId: "", price: "$49.99", per: "a year", note: "That’s $4.17 a month, paid once a year.", save: "Save 30%"),
                    Offer(id: "monthly", productId: "", price: "$5.99", per: "a month", note: "Paid monthly. Cancel anytime.", save: "")]
      let want = props.goPro
      var vm = GoProVM(kind: .priced, offers: offers, pick: props.goProPick ?? (want == "Monthly" ? "monthly" : "yearly"))
      vm.busy = props.goProBuying ?? (want == "Buying") ? "buy" : ""
      switch want {
      case "Loading": vm.kind = .loading
      case "Not yet": vm.kind = .soon
      case "Offline": vm.kind = .offline
      case "Pro": vm.kind = .pro; vm.proLine = "Yearly · renews September 24, 2027 · Billed on the web"
      case "Error": vm.line = "That didn’t go through. Try again."
      default: break
      }
      return vm
    }
    if plan.pro { return GoProVM(kind: .pro, proLine: plan.line(web: true)) }
    var vm = GoProVM(offers: shop.offers, pick: shop.pick, busy: shop.busy, line: shop.line, lineIsError: shop.lineIsError)
    switch shop.catalog {
    case .loading: vm.kind = .loading
    case .unavailable: vm.kind = .soon
    case .failed: vm.kind = .offline
    case .ready: vm.kind = .priced
    }
    return vm
  }
}

struct GoProSheet: View {
  @Environment(\.theme) private var t
  @EnvironmentObject private var store: Store
  @EnvironmentObject private var nav: Nav
  /// The App Store's offers and what's under way (watched here, so the sheet draws again when they change).
  @ObservedObject var shop: Shop

  var body: some View {
    let vm = store.goProVM()
    VStack(alignment: .leading, spacing: 14) {
      HStack(spacing: 12) {
        Text(vm.kind == .pro ? "Lucida Pro" : "Go Pro").css(22, .semibold, ls: -0.02).line(22).frame(maxWidth: .infinity, alignment: .leading).accessibilityAddTraits(.isHeader).accessibilityIdentifier("goPro.title")
        CloseX(action: nav.close)
      }
      ScrollView(showsIndicators: false) {
        VStack(alignment: .leading, spacing: 14) {
          if vm.kind == .priced && vm.offers.count > 1 { billing(vm) }
          card(vm)
          if !vm.line.isEmpty { CSSText(vm.line, 13, lh: 1.4, color: vm.lineIsError ? t.again : t.muted).accessibilityAddTraits(.isStaticText).accessibilityIdentifier("goPro.line") }
        }
      }
      if vm.kind == .pro {
        Button(action: nav.close) {
          Text("Done").css(16, .semibold).foregroundStyle(t.invText).frame(maxWidth: .infinity).frame(height: 52).background(Capsule().fill(t.inv))
        }
        .buttonStyle(.press).accessibilityIdentifier("goPro.done")
      } else { footer(vm) }
    }
    .foregroundStyle(t.text)
    .padding(.top, 20).padding(.horizontal, 20).padding(.bottom, 34)
    .task { await opened() }
    .onChange(of: shop.done) { _, done in if done { shop.reset(); nav.close() } }
  }

  /// Opens with fresh words, and asks the App Store for its offers.
  private func opened() async {
    guard !store.demo else { return }
    shop.reset()
    await shop.load()
  }

  // ---------- Monthly or Yearly ----------
  private func billing(_ vm: GoProVM) -> some View {
    HStack(spacing: 0) {
      ForEach(vm.offers.sorted { $0.id == "monthly" && $1.id != "monthly" }) { o in
        let on = o.id == vm.pick
        Button { pick(o.id) } label: {
          HStack(spacing: 8) {
            Text(o.id == "yearly" ? "Yearly" : "Monthly").css(14, .semibold).line(14)
            if !o.save.isEmpty {
              Text(o.save).css(12, .semibold).foregroundStyle(t.good).line(12).padding(.horizontal, 8).frame(height: 22).background(Capsule().fill(t.goodTint))
            }
          }
          .foregroundStyle(on ? t.invText : t.text)
          .frame(maxWidth: .infinity).frame(height: 40)
          .background(Capsule().fill(on ? t.inv : .clear))
          .contentShape(Capsule())
        }
        .buttonStyle(.flat)
        .disabled(!vm.busy.isEmpty)
        .accessibilityElement(children: .ignore)
        .accessibilityLabel((o.id == "yearly" ? "Yearly" : "Monthly") + (o.save.isEmpty ? "" : ", " + o.save))
        .accessibilityAddTraits(on ? [.isButton, .isSelected] : .isButton)
        .accessibilityIdentifier("goPro.pick." + o.id)
      }
    }
    .padding(4)
    .background(Capsule().fill(t.surf))
  }

  private func pick(_ id: String) {
    if store.demo { store.props.goProPick = id } else { shop.pick = id }
  }

  // ---------- the Pro card ----------
  private func card(_ vm: GoProVM) -> some View {
    MeshCard(mesh: Mesh.palette("Midnight"), radius: 28) {
      VStack(alignment: .leading, spacing: 20) {
        VStack(alignment: .leading, spacing: 6) {
          HStack(spacing: 8) { Icon("sparkle", 18, 1.8); Text("Pro").css(20, .semibold, ls: -0.01).line(20) }
          Text("Make Lucida yours.").css(15).opacity(0.8).line(15)
        }
        switch vm.kind {
        case .priced, .loading: price(vm)
        case .soon: pill("Pro isn’t available on iPhone yet")
        case .offline:
          VStack(spacing: 10) {
            pill("Couldn’t reach the App Store")
            white("Try again", enabled: true, id: "goPro.retry") { Task { await shop.load(again: true) } }
          }
        case .pro:
          VStack(alignment: .leading, spacing: 6) {
            HStack(spacing: 10) { Icon("check", 22, 2.4); Text("You’re on Pro").css(24, .semibold, ls: -0.02).line(24) }
            CSSText(vm.proLine, 14, color: .white).opacity(0.75)
          }
        }
        VStack(alignment: .leading, spacing: 12) {
          Text("Everything in Free, plus:").css(14).opacity(0.9).line(14)
          VStack(alignment: .leading, spacing: 12) {
            ForEach(Generated.proPlan, id: \.self) { x in
              HStack(alignment: .top, spacing: 10) {
                Icon("check", 17, 2.2).padding(.top, 1)
                CSSText(x, 15, lh: 1.35, color: .white)
              }
            }
          }
        }
      }
      .padding(.top, 22).padding(.horizontal, 24).padding(.bottom, 24)
      .frame(maxWidth: .infinity, alignment: .leading)
    }
  }

  /// The price (the App Store's own), what it comes to, and Go Pro; or grey blocks while the App Store is asked.
  @ViewBuilder private func price(_ vm: GoProVM) -> some View {
    if vm.kind == .loading {
      VStack(alignment: .leading, spacing: 14) {
        RoundedRectangle(cornerRadius: 14, style: .continuous).fill(Color.white.opacity(0.18)).frame(width: 190, height: 56)
        RoundedRectangle(cornerRadius: 9, style: .continuous).fill(Color.white.opacity(0.18)).frame(width: 230, height: 18)
      }
      .accessibilityElement().accessibilityLabel("Loading")
      white("Go Pro", enabled: false, id: "goPro.buy") {}
    } else if let o = vm.offer {
      VStack(alignment: .leading, spacing: 6) {
        HStack(alignment: .firstTextBaseline, spacing: 8) {
          Text(o.price).css(56, .semibold, ls: -0.04).lineBox(56).accessibilityIdentifier("goPro.price")
          Text(o.per).css(16).opacity(0.75).line(16).accessibilityIdentifier("goPro.per")
        }
        CSSText(o.note, 14, color: .white).opacity(0.75).frame(minHeight: 20, alignment: .topLeading).accessibilityIdentifier("goPro.note")
      }
      white(vm.busy == "buy" ? "Going Pro…" : "Go Pro", enabled: vm.busy.isEmpty, id: "goPro.buy") { buy() }
    }
  }

  private func pill(_ words: String) -> some View {
    Text(words).css(15, .semibold).line(15).multilineTextAlignment(.center)
      .frame(maxWidth: .infinity).frame(height: 50)
      .background(Capsule().fill(Color.white.opacity(0.16)))
      .overlay(Capsule().strokeBorder(Color.white.opacity(0.35), lineWidth: 1))
      .accessibilityElement(children: .ignore).accessibilityLabel(words).accessibilityAddTraits(.isStaticText)
  }

  private func white(_ label: String, enabled: Bool, id: String, action: @escaping () -> Void) -> some View {
    Button(action: action) {
      Text(label).css(15, .semibold).line(15).foregroundStyle(Color.black).frame(maxWidth: .infinity).frame(height: 50)
        .background(Capsule().fill(Color.white)).opacity(enabled ? 1 : 0.55)
    }
    .buttonStyle(.press)
    .disabled(!enabled)
    .accessibilityIdentifier(id)
  }

  // ---------- Go Pro ----------
  private func buy() {
    if store.demo {
      store.props.goProBuying = true
      Task { try? await Task.sleep(nanoseconds: 1_200_000_000); store.props.goProBuying = false }
      return
    }
    Task { await shop.buy() }
  }
  private func restore() {
    guard !store.demo else { return }
    Task { await shop.restore() }
  }

  // ---------- Restore purchases, how it renews, and the terms ----------
  private func footer(_ vm: GoProVM) -> some View {
    let every = vm.pick == "monthly" ? "month" : "year"
    return VStack(spacing: 8) {
      Button(action: restore) {
        Text(vm.busy == "restore" ? "Restoring…" : "Restore purchases").css(15, .semibold).line(15).foregroundStyle(t.text).padding(.horizontal, 16).frame(height: 40)
      }
      .buttonStyle(.press)
      .disabled(!vm.busy.isEmpty)
      .accessibilityIdentifier("goPro.restore")
      if vm.kind == .priced {
        CSSText("Billed to your Apple Account. Renews every \(every) until you cancel it, in iPhone Settings under Subscriptions.", 12, lh: 1.5, color: t.muted, align: .center)
          .frame(maxWidth: 310).accessibilityIdentifier("goPro.legal")
      }
      HStack(spacing: 14) {
        legal("Terms", "https://lucida.cards/terms")
        legal("Privacy", "https://lucida.cards/privacy")
      }
    }
    .frame(maxWidth: .infinity)
  }
  private func legal(_ label: String, _ url: String) -> some View {
    Button { nav.open(URL(string: url)) } label: { Text(label).css(13).foregroundStyle(t.muted).underline().line(13) }
      .buttonStyle(.plain)
      .accessibilityLabel(label).accessibilityAddTraits(.isLink)
  }
}
