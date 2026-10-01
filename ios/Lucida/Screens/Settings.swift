// iPhone · Settings (PhoneSettings), from the gear on Today: your account, studying, the look, your AI, and what Apple asks every
// app to have inside it (the Account group: a password, the people you blocked, and Delete account).
import StoreKit
import SwiftUI

extension Store {
  /// Changes a setting: shown at once and saved on the server after (saveNow), or kept on the design screen. The save
  /// comes back, for waiting on it.
  @discardableResult
  func setSetting(_ patch: [String: Any]) -> Task<Void, Never>? {
    if demo {
      for (k, v) in patch {
        switch k {
        case "look": props.look = v as? String ?? "system"
        case "darkMode": props.darkMode = v as? String ?? "black"
        case "grads": props.grads = v as? String ?? "mix"
        case "fsrs": props.fsrs = v as? Bool ?? true
        case "flip": props.flip = v as? Bool ?? true
        case "check": props.check = v as? Bool ?? true
        case "prog": props.prog = v as? String ?? "bar"
        case "photo": props.photo = v as? String ?? "color"
        case "yourPhoto": props.yourPhoto = v as? String
        case "color": props.color = v as? Int ?? 0
        case "theme": props.theme = v as? String ?? "lucida"
        case "themeProfile": props.themeProfile = v as? Bool ?? true
        default: break
        }
      }
      return nil
    }
    return saveNow("settings.update", ["patch": patch]) { Store.patch(&$0.settings, patch) }
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
      case "flip": s.flip = v as? Bool ?? s.flip
      case "perDay": s.perDay = v as? Int ?? s.perDay
      case "goal": s.goal = v as? Int ?? s.goal
      case "reminder": s.reminder = v as? String ?? s.reminder
      case "color": s.color = v as? Int ?? s.color
      case "photo": s.photo = v as? String ?? s.photo
      case "yourPhoto": s.yourPhoto = v as? String
      case "welcomed": s.welcomed = v as? Bool ?? s.welcomed
      case "name": s.name = v as? String ?? s.name
      case "theme": s.theme = v as? String ?? s.theme
      case "themeProfile": s.themeProfile = v as? Bool ?? s.themeProfile
      default: break
      }
    }
  }
  /// Flip animation (Settings › Studying): on unless you turned it off. Off, a card's other side just appears (Review, Cards to check,
  /// the welcome): no 3D turn, no pop, no fade. Reduce Motion doesn't change it either way.
  var flipOn: Bool { demo ? props.flip : settings.flip }
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
    // (Their daily reminder goes with them. Only on purpose: a session that ran out, or opening the app with no network, leaves it.)
    Reminder.shared.remove()
    lib = Library(); session = nil; signInStep = .email; phase = .signedOut
  }
}

struct SettingsScreen: View {
  @Environment(\.theme) private var t
  @EnvironmentObject private var store: Store
  @EnvironmentObject private var nav: Nav
  @State private var account = false
  /// The daily reminder (what the phone has scheduled, and whether notices are allowed), which the row below reads.
  @ObservedObject private var reminder = Reminder.shared
  /// Account → Password: its form open, what's typed, what the server said, and whether it worked.
  @State private var pwOpen = false
  @State private var pw = ""
  @State private var pwBusy = false
  @State private var pwMsg = ""
  @State private var pwOk = false
  /// Account → Blocked people: who was just unblocked (gone from the list before the server has answered), and a failure.
  @State private var unblocked: Set<String> = []
  @State private var blockErr = ""
  @FocusState private var pwFocus: Bool

  var body: some View {
    let s = store.settings, demo = store.demo
    let look = demo ? store.props.look : s.look, grads = demo ? store.props.grads : s.grads, darkMode = demo ? store.props.darkMode : s.darkMode
    let fsrs = demo ? store.props.fsrs : s.fsrs, check = demo ? store.props.check : store.lib.ai.perms.check, flip = store.flipOn
    let vst = store.netVerify()
    ScrollView(showsIndicators: false) {
      VStack(alignment: .leading, spacing: 18) {
        HStack(spacing: 12) {
          RoundButton(icon: "back", label: "Back") { nav.back() }
          Text("Settings").css(17, .semibold).frame(maxWidth: .infinity)
          Color.clear.frame(width: 44, height: 44)
        }
        Button { account = true } label: {
          HStack(spacing: 14) {
            MyAvatar(size: 44)
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
        // Your handle opens your profile; Edit profile opens it with its editor open. Before you have a handle it says
        // Your profile (opening it makes one). Get verified (teachers and schools) opens its sheet, and says Waiting for
        // review once a request is in; once you are verified, the row says Verified teacher (or school), with the check
        // and no link.
        group("Profile") {
          Button { nav.profile("") } label: { row(store.myHandle.isEmpty ? "Your profile" : "@" + store.myHandle) { value("View profile") } }.buttonStyle(.plain)
          divider
          Button { nav.wantsEdit = true; nav.profile("") } label: { row("Edit profile") { value("") } }.buttonStyle(.plain)
          divider
          if vst.verified.isEmpty {
            Button { withAnimation(.out(0.35)) { nav.sheet = .verify } } label: { row("Get verified") { value(vst.open ? "Waiting for review" : "") } }.buttonStyle(.plain)
          } else {
            let label = vst.verified == "school" ? "Verified school" : "Verified teacher"
            row(label) { Icon("shield", 20, 2).foregroundStyle(Color(hex: 0x3E63DD)) }
              .accessibilityElement(children: .ignore).accessibilityLabel(label).accessibilityAddTraits(.isStaticText)
          }
        }
        group("Profile picture") { photoPanel }
        planGroup
        group("Studying") {
          // Off, or a time: picking a time turns the reminder on (the phone asks to send notices then), Off turns it off, and with notices off
          // for Lucida in iPhone Settings the row stays Off and says how to allow them.
          menuRow("Daily reminder", store.reminderValue, options: [Reminder.off] + Reminder.times, sub: store.reminderRefused ? Reminder.refusedLine : nil) { chooseReminder($0) }
          divider
          menuRow("New cards a day", "\(s.perDay)", options: ["0", "5", "10", "15", "20", "30", "50"]) { store.setSetting(["perDay": Int($0) ?? 20]) }
          divider
          menuRow("Remember goal", "\(s.goal)%", options: ["80%", "85%", "90%", "93%", "95%"]) { store.setSetting(["goal": Int($0.dropLast()) ?? 90]) }
          divider
          row("Schedule with FSRS", sub: "For 4 grades and ✓ / ✗") { Toggle48(on: fsrs, label: "Schedule with FSRS") { store.setSetting(["fsrs": !fsrs]) } }
          divider
          row("Flip animation") { Toggle48(on: flip, label: "Flip animation") { store.setSetting(["flip": !flip]) } }
          divider
          TuneRow()
        }
        group("Look") {
          row("Appearance") { seg([("system", "System"), ("light", "Light"), ("dark", "Dark")], look) { store.setSetting(["look": $0]) } }
          divider
          // Gray or black, for whenever the app is dark (the owner: "grayish not fully blackedout").
          row("Dark mode", sub: "When the app is dark") { seg([("gray", "Gray"), ("black", "Black")], darkMode == "gray" ? "gray" : "black") { store.setSetting(["darkMode": $0]) } }
          divider
          Button { nav.push(.themes) } label: { themeRow }.buttonStyle(.plain)
          divider
          // A theme draws the deck covers, so the gradients only matter with Lucida's own look.
          row("Card gradients", sub: store.skinKey != nil ? "With the Lucida theme" : nil) { seg([("mix", "Mix"), ("vivid", "Vivid"), ("deep", "Deep")], grads) { store.setSetting(["grads": $0]) } }
        }
        group("Your AI") {
          Button { nav.openConnect() } label: { row("Connect AI") { value(connected) } }.buttonStyle(.plain)
          divider
          row("Check AI cards first") { Toggle48(on: check, label: "Check AI cards first") { store.setCheck(!check) } }
          divider
          Button { nav.push(.inbox) } label: { row("Cards to check") { value("\(store.pendingCount)") } }.buttonStyle(.plain)
        }
        if demo || store.lib.me != nil { accountGroup }
      }
      .foregroundStyle(t.text)
      .padding(.horizontal, 20).padding(.top, Screen.top(64)).padding(.bottom, 34)
    }
    // (Password's Save sits under the keyboard on a short screen: scrolling puts the keyboard away.)
    .scrollDismissesKeyboard(.interactively)
    // The daily reminder is read from the phone when this opens and when you come back (from iPhone Settings, say, after allowing notices).
    .task { if !store.demo { await reminder.refresh() } }
    .onReceive(NotificationCenter.default.publisher(for: UIApplication.willEnterForegroundNotification)) { _ in if !store.demo { Task { await reminder.refresh() } } }
    .debugScroll()
    .ignoresSafeArea()
    .toolbar(.hidden, for: .navigationBar)
    .onAppear {
      // (The design screens' Tweaks: Password open, and Delete account's question.)
      if store.demo { pwOpen = store.props.passwordOpen; if !store.props.deleteOpen.isEmpty && nav.sheet == nil { nav.sheet = .deleteAccount } }
    }
  }

  /// Profile picture (photoPanel on the canvas), on the gray row.
  private var photoPanel: some View {
    PhotoChoices().frame(maxWidth: .infinity, alignment: .leading).padding(.horizontal, 16).padding(.top, 12).padding(.bottom, 16)
  }

  /// PLAN: Free with Go Pro; or Pro with when it renews (or ends) and who bills it. A plan billed by Apple has Manage plan and Cancel
  /// Pro (the system's own subscriptions screen); Pro bought on the web says so and has no link (PhoneSettings, `plan`).
  @ViewBuilder private var planGroup: some View {
    let plan = store.plan
    if plan.pro {
      group("Plan") {
        HStack(spacing: 12) {
          VStack(alignment: .leading, spacing: 2) {
            HStack(spacing: 8) { Text("Lucida").css(16); ProBadge() }
            Text(plan.line(web: store.plansWeb)).css(12).foregroundStyle(t.muted)
          }
          .frame(maxWidth: .infinity, alignment: .leading)
        }
        .padding(.horizontal, 16).padding(.vertical, 8).frame(minHeight: 52)
        if store.plansManage {
          divider
          Button { openManage() } label: { row("Manage plan") { value("") } }.buttonStyle(.plain)
          divider
          Button { openManage() } label: {
            if plan.ending { row("Keep Pro") { value("") } } else { row("Cancel Pro", color: t.again) { EmptyView() } }
          }
          .buttonStyle(.plain)
        }
      }
    } else {
      group("Plan") {
        row("Free", sub: "Pro adds exam tools, deeper stats, and more") {
          Button { nav.goPro() } label: {
            Text("Go Pro").css(14, .semibold).foregroundStyle(t.invText).padding(.horizontal, 16).frame(height: 36).background(Capsule().fill(t.inv))
          }
          .buttonStyle(.press)
        }
      }
    }
  }

  /// Manage plan, Cancel Pro, and Keep Pro: the system's own subscriptions screen (a subscription bought with the App Store can
  /// only be changed there), or if it can't open, Apple's page for it.
  private func openManage() {
    guard !store.demo else { return }
    let url = URL(string: store.lib.me?.manage.nilIfEmpty ?? "https://apps.apple.com/account/subscriptions")
    Task { @MainActor in
      if let scene = UIApplication.shared.connectedScenes.compactMap({ $0 as? UIWindowScene }).first, (try? await AppStore.showManageSubscriptions(in: scene)) != nil { return }
      nav.open(url)
    }
  }

  // ---------- ACCOUNT: a password, the people you blocked, Delete account ----------
  private var accountGroup: some View {
    let list = store.netBlocks(), people = (list?.value?.people ?? []).filter { !unblocked.contains($0.handle) }
    let count = list?.value == nil ? "" : people.isEmpty ? "None" : String(people.count)
    return group("Account") {
      Button { withAnimation(.out(0.2)) { pwOpen.toggle(); pw = ""; pwMsg = ""; pwOk = false } } label: {
        row("Password", sub: "Optional. Sign in without an email code.") { value("") }
      }
      .buttonStyle(.plain)
      if pwOpen { passwordForm }
      divider
      row("Blocked people") { Text(count).css(15).foregroundStyle(t.muted) }
      ForEach(people, id: \.handle) { b in
        divider
        HStack(spacing: 12) {
          PersonAvatar(p: b, size: 36)
          VStack(alignment: .leading, spacing: 2) {
            Text(b.name).css(16).lineLimit(1)
            Text("@" + b.handle).css(12).foregroundStyle(t.muted).lineLimit(1)
          }
          .frame(maxWidth: .infinity, alignment: .leading)
          SmallButton(label: "Unblock", bg: t.bg) { unblock(b) }
        }
        .padding(.horizontal, 16).padding(.vertical, 8).frame(minHeight: 52)
        .accessibilityElement(children: .contain)
      }
      if !blockErr.isEmpty {
        divider
        CSSText(blockErr, 13, lh: 1.4, color: t.again).padding(.horizontal, 16).padding(.vertical, 10).frame(maxWidth: .infinity, alignment: .leading)
      }
      divider
      Button { withAnimation(.out(0.35)) { nav.sheet = .deleteAccount } } label: { row("Delete account", color: t.again) { EmptyView() } }.buttonStyle(.plain)
    }
  }

  /// Unblock works at once (the row goes); if the server won't, it comes back with the server's words.
  private func unblock(_ b: NetPerson) {
    unblocked.insert(b.handle); blockErr = ""
    Task {
      do { try await store.block(b.handle, false) }
      catch { unblocked.remove(b.handle); blockErr = error.localizedDescription.nilIfEmpty ?? "Something went wrong. Try again." }
    }
  }

  /// Password's form: a new password (8 to 72 characters), Save and Close, and what happened.
  private var passwordForm: some View {
    VStack(alignment: .leading, spacing: 10) {
      CSSText("Sign in with your email and a password instead of a code. You can still use a code any time.", 13, lh: 1.45, color: t.muted)
      SecureField("", text: $pw, prompt: Text("New password, 8 or more characters").foregroundStyle(PLACEHOLDER))
        .focused($pwFocus)
        .textContentType(.newPassword).textInputAutocapitalization(.never).autocorrectionDisabled()
        .submitLabel(.done).onSubmit(savePassword)
        .font(.geist(16)).foregroundStyle(t.text)
        .padding(.horizontal, 16).frame(height: 44)
        .background(Capsule().fill(t.bg))
        // (Typing clears what was said; emptying the field after a save must not clear "Password saved.")
        .onChange(of: pw) { _, v in if !v.isEmpty { pwMsg = ""; pwOk = false } }
        .accessibilityLabel("New password")
      HStack(spacing: 8) {
        Button(action: savePassword) {
          Text(pwBusy ? "Saving…" : "Save").css(14, .semibold).foregroundStyle(t.invText).padding(.horizontal, 20).frame(height: 40).background(Capsule().fill(t.inv))
        }
        .buttonStyle(.press)
        Button { withAnimation(.out(0.2)) { pwOpen = false; pw = ""; pwMsg = ""; pwOk = false } } label: {
          Text("Close").css(14, .semibold).foregroundStyle(t.text).padding(.horizontal, 16).frame(height: 40).background(Capsule().fill(t.bg))
        }
        .buttonStyle(.press)
      }
      if !pwMsg.isEmpty { CSSText(pwMsg, 13, lh: 1.4, color: pwOk ? t.good : t.again).accessibilityAddTraits(.isStaticText) }
    }
    .padding(.horizontal, 16).padding(.top, 4).padding(.bottom, 16)
    .frame(maxWidth: .infinity, alignment: .leading)
  }

  private func savePassword() {
    guard !pwBusy else { return }
    guard pw.count >= 8, pw.count <= 72 else { pwMsg = "Use 8 to 72 characters."; pwOk = false; return }
    pwFocus = false; pwBusy = true; pwMsg = ""
    let typed = pw
    Task {
      do { try await store.setPassword(typed); pwOk = true; pwMsg = "Password saved."; pw = "" }
      catch APIError.signedOut { store.phase = .signedOut }
      catch { pwOk = false; pwMsg = error.localizedDescription.nilIfEmpty ?? "That didn’t work. Try again in a minute." }
      pwBusy = false
    }
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
        // (Wrapped like a browser: SwiftUI's Text would move a lone last word down.)
        if let sub { WebText(text: sub, size: 12, color: t.muted) }
      }
      .frame(maxWidth: .infinity, alignment: .leading)
      right()
    }
    .foregroundStyle(t.text)
    .padding(.horizontal, 16).padding(.vertical, 8)
    .frame(minHeight: 52)
    .contentShape(Rectangle())
  }

  /// Theme: your theme's name (Lucida on Free), with the Pro badge on Free (THEME_ROW).
  private var themeRow: some View {
    HStack(spacing: 12) {
      HStack(spacing: 8) { Text("Theme").css(16); if !store.isPro { ProBadge() } }.frame(maxWidth: .infinity, alignment: .leading)
      value(store.themeShort)
    }
    .foregroundStyle(t.text)
    .padding(.horizontal, 16).padding(.vertical, 8)
    .frame(minHeight: 52)
    .contentShape(Rectangle())
  }

  private func value(_ v: String) -> some View {
    HStack(spacing: 6) { Text(v).css(15).lineLimit(1); Icon("chev", 14, 2.2) }.foregroundStyle(t.muted)
  }

  private func menuRow(_ label: String, _ current: String, options: [String], sub: String? = nil, pick: @escaping (String) -> Void) -> some View {
    Menu {
      ForEach(options, id: \.self) { o in Button(o) { pick(o) } }
    } label: { row(label, sub: sub) { value(current) } }
  }

  /// Daily reminder: Off removes it; a time sets it (the phone asks to send notices then) and is kept with your settings.
  private func chooseReminder(_ pick: String) {
    if store.demo { store.props.reminder = pick; store.props.reminderNote = false; return }
    Task { if await reminder.choose(pick) { store.setSetting(["reminder": pick]) } }
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

/// Your profile picture's choices (photoPanel on the canvas; Settings and Edit profile): Google photo (for Google
/// sign-ins), Your photo, or Color, across the row; then your colors, a line about the Google photo, or Change photo and
/// Remove. Picking Your photo before there is one opens the photo picker, like Change photo.
struct PhotoChoices: View {
  @Environment(\.theme) private var t
  @EnvironmentObject private var store: Store
  @State private var pickingPhoto = false
  var body: some View {
    let choice = store.photoChoice, color = store.avatarColor
    let skinned = store.skinKey != nil
    let options = (store.hasGooglePhoto ? [("google", "Google photo")] : []) + [("yours", "Your photo"), ("color", skinned ? "Theme" : "Color")]
    VStack(alignment: .leading, spacing: 12) {
      HStack(spacing: 2) {
        ForEach(options, id: \.0) { id, label in
          let on = id == choice
          Button { if id == "yours" && !store.hasYourPhoto { pickingPhoto = true } else { store.setSetting(["photo": id]) } } label: {
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
      // With a theme on, the theme draws the circle and your letter, so there are no colors to pick.
      case _ where skinned: EmptyView()
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
    // Your photo goes up small: it only ever shows small.
    .photoPicker($pickingPhoto, side: Upload.profileSide) { store.setYourPhoto($0) }
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
