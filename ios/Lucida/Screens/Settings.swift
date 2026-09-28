// iPhone · Settings (PhoneSettings), from the gear on Today: your account, studying, the look, and your AI.
import SwiftUI

extension Store {
  /// Changes a setting: shown at once and saved on the server after (saveNow), or kept on the design screen.
  func setSetting(_ patch: [String: Any]) {
    if demo {
      for (k, v) in patch {
        switch k {
        case "look": props.look = v as? String ?? "system"
        case "darkMode": props.darkMode = v as? String ?? "black"
        case "grads": props.grads = v as? String ?? "mix"
        case "fsrs": props.fsrs = v as? Bool ?? true
        case "check": props.check = v as? Bool ?? true
        case "prog": props.prog = v as? String ?? "bar"
        case "photo": props.photo = v as? String ?? "color"
        case "yourPhoto": props.yourPhoto = v as? String
        case "color": props.color = v as? Int ?? 0
        default: break
        }
      }
      return
    }
    saveNow("settings.update", ["patch": patch]) { Store.patch(&$0.settings, patch) }
  }
  /// A settings.update patch made to a copy of your settings.
  static func patch(_ s: inout UserSettings, _ patch: [String: Any]) {
    for (k, v) in patch {
      switch k {
      case "look": s.look = v as? String ?? s.look
      case "darkMode": s.darkMode = v as? String ?? s.darkMode
      case "grads": s.grads = v as? String ?? s.grads
      case "prog": s.prog = v as? String ?? s.prog
      case "fsrs": s.fsrs = v as? Bool ?? s.fsrs
      case "perDay": s.perDay = v as? Int ?? s.perDay
      case "goal": s.goal = v as? Int ?? s.goal
      case "reminder": s.reminder = v as? String ?? s.reminder
      case "color": s.color = v as? Int ?? s.color
      case "photo": s.photo = v as? String ?? s.photo
      case "yourPhoto": s.yourPhoto = v as? String
      default: break
      }
    }
  }
  /// "Check AI cards first" is the AI link's own permission.
  func setCheck(_ on: Bool) {
    if demo { props.check = on; return }
    saveNow("ai.perm", ["id": "check", "on": on]) { $0.ai.perms.check = on }
  }

  // ---------- your profile picture ----------
  /// Your Google photo, when you signed in with Google (the canvas's person did).
  var googlePhoto: String? { (lib.me?.picture).flatMap { $0.isEmpty ? nil : $0 } }
  var hasGooglePhoto: Bool { demo || googlePhoto != nil }
  var hasYourPhoto: Bool { (demo ? props.yourPhoto : settings.yourPhoto) != nil }
  /// Your picture (db.js photoOf): what you picked in Settings, and until you pick, your Google photo if you signed in
  /// with Google (the owner: "the user profile should show their google account profile pic or allow user to change the
  /// profile pic image with upload"). "google", "yours", or "color".
  var photoChoice: String {
    if demo { return props.photo }
    let g = googlePhoto != nil, p = settings.photo
    return p == "google" && g ? "google" : p == "yours" && settings.yourPhoto != nil ? "yours" : p == "color" || !g ? "color" : "google"
  }
  /// What your circle shows, wherever it is (Today's header, Settings); the design screens draw the canvas's stand-ins.
  var avatar: AvatarPic {
    switch photoChoice {
    case "google": return demo ? .sampleGoogle : .photo(googlePhoto.flatMap(API.media))
    case "yours": return demo ? .sampleYours : .photo(settings.yourPhoto.flatMap(API.media))
    default: return .color
    }
  }
  var avatarColor: Int { demo ? props.color : settings.color }
  /// A photo you picked is now your picture.
  func setYourPhoto(_ url: String) { setSetting(["photo": "yours", "yourPhoto": url]) }
  /// Remove: back to your Google photo, or to your color when there's none (the canvas goes back to its Google photo).
  func removePhoto() {
    if demo { props.photo = "google"; props.yourPhoto = nil; return }
    setSetting(["photo": "", "yourPhoto": NSNull()])
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
  @State private var pickingPhoto = false

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
            Avatar(size: 44, initial: store.avatarInitial, color: store.avatarColor, pic: store.avatar)
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
        group("Profile picture") { photoPanel }
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
    .debugScroll()
    .ignoresSafeArea()
    .toolbar(.hidden, for: .navigationBar)
    // Your photo goes up small: it only ever shows small.
    .photoPicker($pickingPhoto, side: Upload.profileSide) { store.setYourPhoto($0) }
  }

  /// Profile picture (photoPanel on the canvas): Google photo (for Google sign-ins), Your photo, or Color, across the
  /// row; then your colors, a line about the Google photo, or Change photo and Remove. Picking Your photo before there is
  /// one opens the photo picker, like Change photo.
  private var photoPanel: some View {
    let choice = store.photoChoice, color = store.avatarColor
    let options = (store.hasGooglePhoto ? [("google", "Google photo")] : []) + [("yours", "Your photo"), ("color", "Color")]
    return VStack(alignment: .leading, spacing: 12) {
      HStack(spacing: 2) {
        ForEach(options, id: \.0) { id, label in
          let on = id == choice
          Button { id == "yours" && !store.hasYourPhoto ? (pickingPhoto = true) : store.setSetting(["photo": id]) } label: {
            Text(label).css(13, .semibold).lineLimit(1).foregroundStyle(on ? t.invText : t.muted)
              .padding(.horizontal, 8).frame(maxWidth: .infinity).frame(height: 30)
              .background(Capsule().fill(on ? t.inv : .clear)).contentShape(Capsule())
          }
          .buttonStyle(.plain)
          .accessibilityAddTraits(on ? .isSelected : [])
        }
      }
      .padding(3)
      .background(Capsule().fill(t.bg))
      switch choice {
      case "google":
        Text("Uses the photo on your Google account. Change it there and it updates here.").css(13, lh: 1.45).foregroundStyle(t.muted)
          .fixedSize(horizontal: false, vertical: true)
      case "yours":
        HStack(spacing: 8) {
          SmallButton(label: "Change photo", icon: "image", bg: t.bg) { pickingPhoto = true }
          SmallButton(label: "Remove", bg: t.bg) { store.removePhoto() }
        }
      default:
        HStack(spacing: 10) {
          ForEach(Avatar.colors.indices, id: \.self) { i in
            Button { store.setSetting(["color": i]) } label: {
              Circle().fill(LinearGradient(colors: Avatar.colors[i].map { Color(hex: $0) }, startPoint: .topLeading, endPoint: .bottomTrailing))
                .frame(width: 34, height: 34)
                .overlay { if i == color { Circle().strokeBorder(t.text, lineWidth: 2).padding(-4) } }
            }
            .buttonStyle(.press)
            .accessibilityLabel(Avatar.names[i])
            .accessibilityAddTraits(i == color ? .isSelected : [])
          }
        }
      }
    }
    .frame(maxWidth: .infinity, alignment: .leading)
    .padding(.horizontal, 16).padding(.top, 12).padding(.bottom, 16)
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

extension Store {
  /// The letter on your color: the first of your name (from Google or Apple), or Y for "You" (the canvas shows "A").
  var avatarInitial: String {
    if demo { return "A" }
    let n = (settings.name.isEmpty ? lib.me?.name ?? "" : settings.name).trimmingCharacters(in: .whitespacesAndNewlines)
    return String((n.isEmpty ? "You" : n).prefix(1)).uppercased()
  }
}

/// What your circle shows: your initial on your color, a photo (yours or your Google one), or on the design screens the
/// canvas's stand-ins for them.
enum AvatarPic: Equatable { case color, photo(URL?), sampleGoogle, sampleYours }

/// Your circle (AVATAR_ME): your color, with your initial or a photo over it.
struct Avatar: View {
  let size: CGFloat
  let initial: String
  var color = 0
  var pic = AvatarPic.color
  static let colors: [[UInt32]] = [[0x8C9AFC, 0x4F60E6], [0xFFC857, 0xEE5A36], [0x7EE0B0, 0x1F8F5F], [0xF9A8D4, 0xD6336C], [0x7DE3F0, 0x0E8A9E], [0xC4A7FF, 0x7C3AED]]
  static let names = ["Periwinkle", "Orange", "Green", "Pink", "Teal", "Violet"]
  var body: some View {
    let c = Avatar.colors[min(max(color, 0), Avatar.colors.count - 1)]
    ZStack {
      LinearGradient(colors: c.map { Color(hex: $0) }, startPoint: .topLeading, endPoint: .bottomTrailing)
      switch pic {
      case .color: Text(initial).css((size * 0.42).rounded(), .semibold).foregroundStyle(.white)
      case .photo(let url): CachedPhoto(url: url)
      // The canvas's STAND_IN: a person's outline on a warm gradient (the Google photo) or a cool one (yours).
      case .sampleGoogle: StandInPhoto(stops: [(0xFFD9A8, 0), (0xF59E6B, 0.55), (0xD9677A, 1)])
      case .sampleYours: StandInPhoto(stops: [(0xB8F0D8, 0), (0x4FC3B0, 0.5), (0x3A7BD5, 1)])
      }
    }
    .frame(width: size, height: size)
    .clipShape(Circle())
    .accessibilityHidden(true)
  }
}

/// A stand-in for a photo: a white head and shoulders on a gradient (160°), drawn in a 64 x 64 box.
struct StandInPhoto: View {
  let stops: [(UInt32, Double)]
  var body: some View {
    ZStack {
      CSSLinearGradient(angle: 160, stops: stops.map { (RGBA($0.0), $0.1) })
      Canvas { ctx, size in
        let k = size.width / 64, p = CGMutablePath()
        p.addEllipse(in: CGRect(x: 21, y: 15, width: 22, height: 22))
        SVG.addPath("M11 64c1.5-12 10-19 21-19s19.5 7 21 19z", to: p)
        ctx.scaleBy(x: k, y: k)
        ctx.fill(Path(p), with: .color(.white.opacity(0.92)))
      }
    }
  }
}

/// A photo cropped to fill its box, kept once it's loaded so it shows at once on the next page (your circle is on
/// Today and in Settings).
struct CachedPhoto: View {
  let url: URL?
  @State private var loaded: (url: URL, image: UIImage)?
  private static let kept = NSCache<NSURL, UIImage>()
  var body: some View {
    let img = url.flatMap { u in loaded?.url == u ? loaded?.image : CachedPhoto.kept.object(forKey: u as NSURL) }
    Color.clear
      .overlay { if let img { Image(uiImage: img).resizable().scaledToFill() } }
      .clipped()
      .task(id: url) {
        guard let url, CachedPhoto.kept.object(forKey: url as NSURL) == nil else { return }
        guard let (data, resp) = try? await URLSession.shared.data(from: url), (resp as? HTTPURLResponse)?.statusCode ?? 200 < 400,
              let got = UIImage(data: data) else { return }
        CachedPhoto.kept.setObject(got, forKey: url as NSURL)
        loaded = (url, got)
      }
  }
}

extension View {
  /// Debug builds: `-scroll <points>` opens the page scrolled that far (for checking the lower part of a tall board).
  @ViewBuilder func debugScroll() -> some View {
    #if DEBUG
    if let y = Board.arg("-scroll").flatMap(Double.init) { modifier(DebugScroll(y: y)) } else { self }
    #else
    self
    #endif
  }
}
#if DEBUG
private struct DebugScroll: ViewModifier {
  let y: Double
  @State private var pos = ScrollPosition()
  func body(content: Content) -> some View {
    content.scrollPosition($pos).task { try? await Task.sleep(nanoseconds: 300_000_000); pos.scrollTo(y: y) }
  }
}
#endif
