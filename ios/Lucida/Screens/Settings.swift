// iPhone · Settings (PhoneSettings), from the gear on Today: your account, studying, the look, and your AI.
import SwiftUI

extension Store {
  /// Changes a setting: saved on the server (and shown right away), or kept on the design screen.
  func setSetting(_ patch: [String: Any]) {
    if demo {
      for (k, v) in patch {
        switch k {
        case "look": props.look = v as? String ?? "system"
        case "darkMode": props.darkMode = v as? String ?? "black"
        case "grads": props.grads = v as? String ?? "mix"
        case "fsrs": props.fsrs = v as? Bool ?? true
        case "check": props.check = v as? Bool ?? true
        default: break
        }
      }
      return
    }
    var s = lib.settings
    for (k, v) in patch {
      switch k {
      case "look": s.look = v as? String ?? s.look
      case "darkMode": s.darkMode = v as? String ?? s.darkMode
      case "grads": s.grads = v as? String ?? s.grads
      case "fsrs": s.fsrs = v as? Bool ?? s.fsrs
      case "perDay": s.perDay = v as? Int ?? s.perDay
      case "goal": s.goal = v as? Int ?? s.goal
      case "reminder": s.reminder = v as? String ?? s.reminder
      default: break
      }
    }
    lib.settings = s
    Task { await send("settings.update", ["patch": patch]) }
  }
  /// "Check AI cards first" is the AI link's own permission.
  func setCheck(_ on: Bool) {
    if demo { props.check = on; return }
    lib.ai.perms.check = on
    Task { await send("ai.perm", ["id": "check", "on": on]) }
  }
  var pendingCount: Int { demo ? 3 : lib.cards.filter(\.pending).count }
  func signOut() async {
    guard !demo else { return }
    await api.signOut()
    HTTPCookieStorage.shared.cookies?.forEach { HTTPCookieStorage.shared.deleteCookie($0) }
    lib = Library(); session = nil; signInStep = .email; phase = .signedOut
  }
}

struct SettingsScreen: View {
  @Environment(\.theme) private var t
  @EnvironmentObject private var store: Store
  @EnvironmentObject private var nav: Nav
  @State private var account = false

  var body: some View {
    let s = store.settings, demo = store.demo
    let look = demo ? store.props.look : s.look, grads = demo ? store.props.grads : s.grads, darkMode = demo ? store.props.darkMode : s.darkMode
    let fsrs = demo ? store.props.fsrs : s.fsrs, check = demo ? store.props.check : store.lib.ai.perms.check
    ScrollView(showsIndicators: false) {
      VStack(alignment: .leading, spacing: 18) {
        HStack(spacing: 12) {
          RoundButton(icon: "back", label: "Back") { nav.back() }
          Text("Settings").css(17, .semibold).frame(maxWidth: .infinity)
          Color.clear.frame(width: 44, height: 44)
        }
        Button { account = true } label: {
          HStack(spacing: 14) {
            Avatar(size: 44, initial: store.avatarInitial, color: s.color)
            VStack(alignment: .leading, spacing: 2) {
              Text("Your account").css(16, .semibold)
              Text(demo ? "Synced on all your devices · just now" : store.lib.me?.email ?? "Synced on all your devices").css(13).foregroundStyle(t.muted).lineLimit(1)
            }
            .frame(maxWidth: .infinity, alignment: .leading)
            Icon("chev", 14, 2.2).foregroundStyle(t.muted)
          }
          .foregroundStyle(t.text)
          .padding(.horizontal, 16).padding(.vertical, 14)
          .background(RoundedRectangle(cornerRadius: 24, style: .continuous).fill(t.surf))
        }
        .buttonStyle(.press)
        .confirmationDialog("Your account", isPresented: $account) {
          Button("Sign out", role: .destructive) { Task { await store.signOut() } }
        }
        planGroup
        group("Studying") {
          menuRow("Daily reminder", demo ? "9:00 AM" : s.reminder, options: ["7:00 AM", "8:00 AM", "9:00 AM", "12:00 PM", "6:00 PM", "8:00 PM", "9:00 PM"]) { store.setSetting(["reminder": $0]) }
          divider
          menuRow("New cards a day", "\(s.perDay)", options: ["0", "5", "10", "15", "20", "30", "50"]) { store.setSetting(["perDay": Int($0) ?? 20]) }
          divider
          menuRow("Remember goal", "\(s.goal)%", options: ["80%", "85%", "90%", "93%", "95%"]) { store.setSetting(["goal": Int($0.dropLast()) ?? 90]) }
          divider
          row("Schedule with FSRS", sub: "For 4 grades and ✓ / ✗") { Toggle48(on: fsrs, label: "Schedule with FSRS") { store.setSetting(["fsrs": !fsrs]) } }
        }
        group("Look") {
          row("Appearance") { seg([("system", "System"), ("light", "Light"), ("dark", "Dark")], look) { store.setSetting(["look": $0]) } }
          divider
          // Gray or black, for whenever the app is dark (the owner: "grayish not fully blackedout").
          row("Dark mode", sub: "When the app is dark") { seg([("gray", "Gray"), ("black", "Black")], darkMode == "gray" ? "gray" : "black") { store.setSetting(["darkMode": $0]) } }
          divider
          row("Card gradients") { seg([("mix", "Mix"), ("vivid", "Vivid"), ("deep", "Deep")], grads) { store.setSetting(["grads": $0]) } }
        }
        group("Your AI") {
          Button { nav.pick(.connect) } label: { row("Connected apps") { value(connected) } }.buttonStyle(.plain)
          divider
          row("Check AI cards first") { Toggle48(on: check, label: "Check AI cards first") { store.setCheck(!check) } }
          divider
          Button { nav.push(.inbox) } label: { row("Cards to check") { value("\(store.pendingCount)") } }.buttonStyle(.plain)
        }
      }
      .foregroundStyle(t.text)
      .padding(.horizontal, 20).padding(.top, Screen.top(64)).padding(.bottom, 34)
    }
    .ignoresSafeArea()
    .toolbar(.hidden, for: .navigationBar)
  }

  /// PLAN: Free with Go Pro, or Pro with when it renews (or ends) and Stripe's page to manage or cancel it (PhoneSettings).
  @ViewBuilder private var planGroup: some View {
    let plan = store.plan
    if plan.pro {
      group("Plan") {
        HStack(spacing: 12) {
          VStack(alignment: .leading, spacing: 2) {
            HStack(spacing: 8) { Text("Lucida").css(16); ProBadge() }
            Text(planLine(plan)).css(12).foregroundStyle(t.muted)
          }
          .frame(maxWidth: .infinity, alignment: .leading)
        }
        .padding(.horizontal, 16).padding(.vertical, 8).frame(minHeight: 52)
        divider
        Button { openManage() } label: { row("Manage plan") { value("") } }.buttonStyle(.plain)
        divider
        Button { openManage() } label: {
          if plan.ending { row("Keep Pro") { value("") } } else { row("Cancel Pro", color: t.again) { EmptyView() } }
        }
        .buttonStyle(.plain)
      }
    } else {
      group("Plan") {
        row("Free", sub: "Pro adds Learn mode, photo covers, and more") {
          Button { UIApplication.shared.open(URL(string: "https://lucida.cards/pricing")!) } label: {
            Text("Go Pro").css(14, .semibold).foregroundStyle(t.invText).padding(.horizontal, 16).frame(height: 36).background(Capsule().fill(t.inv))
          }
          .buttonStyle(.press)
        }
      }
    }
  }

  /// "Yearly · renews September 24, 2027".
  private func planLine(_ p: Plan) -> String {
    let every = ["month": "Monthly", "year": "Yearly"][p.every] ?? ""
    let iso = ISO8601DateFormatter(), frac = ISO8601DateFormatter()
    frac.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
    var day = ""
    if let d = iso.date(from: p.until) ?? frac.date(from: p.until) {
      let f = DateFormatter(); f.locale = Locale(identifier: "en_US"); f.dateFormat = "MMMM d, yyyy"; f.timeZone = TimeZone(identifier: "UTC")
      day = (p.ending ? "ends " : "renews ") + f.string(from: d)
    }
    return [every, day].filter { !$0.isEmpty }.joined(separator: " · ")
  }

  /// Stripe's page, where Stripe emails a code to the address that paid and then shows the plan.
  private func openManage() {
    guard !store.demo, let url = URL(string: store.lib.me?.manage.nilIfEmpty ?? "https://lucida.cards/pricing") else { return }
    UIApplication.shared.open(url)
  }

  private var connected: String {
    if store.demo { return "Claude, ChatGPT" }
    let n = Array(store.lib.ai.clients.keys).sorted()
    return n.isEmpty ? "None yet" : n.joined(separator: ", ")
  }

  private var divider: some View { Rectangle().fill(t.bg).frame(height: 1).padding(.leading, 16) }

  private func group<Content: View>(_ title: String, @ViewBuilder _ rows: () -> Content) -> some View {
    VStack(alignment: .leading, spacing: 8) {
      Text(title.uppercased()).css(13, .semibold, ls: 0.06).foregroundStyle(t.muted).padding(.horizontal, 4)
      VStack(spacing: 0) { rows() }
        .background(RoundedRectangle(cornerRadius: 24, style: .continuous).fill(t.surf))
        .clipShape(RoundedRectangle(cornerRadius: 24, style: .continuous))
    }
  }

  private func row<Right: View>(_ label: String, sub: String? = nil, color: Color? = nil, @ViewBuilder right: () -> Right) -> some View {
    HStack(spacing: 12) {
      VStack(alignment: .leading, spacing: 2) {
        Text(label).css(16).foregroundStyle(color ?? t.text)
        if let sub { Text(sub).css(12).foregroundStyle(t.muted) }
      }
      .frame(maxWidth: .infinity, alignment: .leading)
      right()
    }
    .foregroundStyle(t.text)
    .padding(.horizontal, 16).padding(.vertical, 8)
    .frame(minHeight: 52)
    .contentShape(Rectangle())
  }

  private func value(_ v: String) -> some View {
    HStack(spacing: 6) { Text(v).css(15).lineLimit(1); Icon("chev", 14, 2.2) }.foregroundStyle(t.muted)
  }

  private func menuRow(_ label: String, _ current: String, options: [String], pick: @escaping (String) -> Void) -> some View {
    Menu {
      ForEach(options, id: \.self) { o in Button(o) { pick(o) } }
    } label: { row(label) { value(current) } }
  }

  /// SEG: a small segmented control on the gray row (white track, black pick).
  private func seg(_ options: [(String, String)], _ cur: String, _ pick: @escaping (String) -> Void) -> some View {
    HStack(spacing: 2) {
      ForEach(options, id: \.0) { id, label in
        Button { pick(id) } label: {
          Text(label).css(13, .semibold).foregroundStyle(id == cur ? t.invText : t.muted)
            .padding(.horizontal, 12).frame(height: 30).background(Capsule().fill(id == cur ? t.inv : .clear))
        }
        .buttonStyle(.plain)
        .accessibilityAddTraits(id == cur ? .isSelected : [])
      }
    }
    .padding(3)
    .background(Capsule().fill(t.bg))
    .fixedSize()
  }
}

/// The Pro badge (PRO_BADGE on the canvas): "Pro" on a periwinkle-to-sky gradient.
struct ProBadge: View {
  var body: some View {
    Text("Pro").css(12, .bold, ls: 0.01).foregroundStyle(.white).padding(.horizontal, 9).frame(height: 22)
      .background(Capsule().fill(LinearGradient(colors: [Color(hex: 0x7E94FB), Color(hex: 0x2CB2EA)], startPoint: .leading, endPoint: .trailing)))
  }
}

/// Your circle: a color and your initial.
extension Store {
  /// Your picture: the first letter of your name on your color (the canvas shows "A").
  var avatarInitial: String { demo ? "A" : String((settings.name.isEmpty ? (lib.me?.name ?? "You") : settings.name).prefix(1)).uppercased() }
}

struct Avatar: View {
  let size: CGFloat
  let initial: String
  var color = 0
  static let colors: [[UInt32]] = [[0x8C9AFC, 0x4F60E6], [0xFFC857, 0xEE5A36], [0x7EE0B0, 0x1F8F5F], [0xF9A8D4, 0xD6336C], [0x7DE3F0, 0x0E8A9E], [0xC4A7FF, 0x7C3AED]]
  var body: some View {
    let c = Avatar.colors[min(max(color, 0), Avatar.colors.count - 1)]
    Text(initial).css((size * 0.42).rounded(), .semibold).foregroundStyle(.white)
      .frame(width: size, height: size)
      .background(Circle().fill(LinearGradient(colors: c.map { Color(hex: $0) }, startPoint: .topLeading, endPoint: .bottomTrailing)))
      .accessibilityHidden(true)
  }
}
