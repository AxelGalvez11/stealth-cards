// iPhone · Profile (PhoneProfile, PhoneProfileOther, PhoneProfileFollowing, PhoneProfileEdit, PhoneProfileSaved,
// PhoneProfileSuggestions, PhoneProfileEmpty, PhoneProfileLoading, PhoneProfileMissing, and the Dark and Gray twins):
// someone's picture, their numbers (decks, followers, following), name, what they study, their bio, and the decks they
// share, pinned ones first. Your own adds Edit profile, ⋯ on each deck to pin it (up to 3), the decks you saved, and
// the suggestions you sent with what became of them. The first time you open yours, it's made (the handle comes from
// your name).
import SwiftUI

/// What you changed on a profile (PROFILE_LOGIC's `over`): a follow, pins, your bio. It shows at once, and stays while
/// it's saving and until the answer from after the last save arrives (until then the page has the answer from before).
struct ProfilePatch {
  var following: Bool? = nil, followers: Int? = nil, featured: [String]? = nil
  var name: String? = nil, bio: String? = nil, school: String? = nil, subject: String? = nil
  mutating func merge(_ o: ProfilePatch) {
    following = o.following ?? following; followers = o.followers ?? followers; featured = o.featured ?? featured
    name = o.name ?? name; bio = o.bio ?? bio; school = o.school ?? school; subject = o.subject ?? subject
  }
  func applied(to p: ProfilePage) -> ProfilePage {
    var p = p
    if let v = following { p.me = .init(isSelf: p.me?.isSelf ?? false, following: v) }
    if let v = followers { p.followers = v }
    if let v = featured { p.featured = v }
    if let v = name { p.name = v }
    if let v = bio { p.bio = v }
    if let v = school { p.school = v }
    if let v = subject { p.subject = v }
    return p
  }
}
struct ProfileOver { var patch = ProfilePatch(); var busy = 0; var stamp: Int? = nil }

extension Store {
  func profilePath(_ h: String) -> String { "api/public/profile?h=" + (h.addingPercentEncoding(withAllowedCharacters: .alphanumerics) ?? h) }
  /// The change shown on a profile now, if there is one.
  func profilePatch(_ h: String) -> ProfilePatch? {
    guard !demo, let o = profileOver[h] else { return nil }
    return o.busy > 0 || o.stamp == netStamp(profilePath(h)) ? o.patch : nil
  }
  /// A profile as it shows: the server's answer with what you changed on top.
  func shownProfile(_ h: String) -> NetAnswer<ProfilePage>? {
    guard let a = netProfile(h) else { return nil }
    if case .ok(let p) = a, let patch = profilePatch(h) { return .ok(patch.applied(to: p)) }
    return a
  }
  /// Makes a change on a profile: shown at once, then saved (`save`); if saving doesn't work, the change goes and the
  /// error comes back.
  func changeProfile(_ h: String, _ patch: ProfilePatch, save: () async throws -> Void) async throws {
    guard !demo else { try await save(); return }
    var o = ProfileOver(patch: profilePatch(h) ?? ProfilePatch(), busy: profileOver[h]?.busy ?? 0, stamp: nil)
    o.patch.merge(patch); o.busy += 1
    profileOver[h] = o
    do {
      try await save()
      guard var now = profileOver[h] else { return }
      now.busy -= 1
      if now.busy == 0 { now.stamp = netStamp(profilePath(h)) }
      profileOver[h] = now
    } catch {
      profileOver[h] = ProfileOver(patch: ProfilePatch(), busy: max(0, (profileOver[h]?.busy ?? 1) - 1), stamp: nil)
      throw error
    }
  }
}

struct ProfileScreen: View {
  @Environment(\.theme) private var t
  @EnvironmentObject private var store: Store
  @EnvironmentObject private var nav: Nav
  /// Whose ("": yours).
  let handle: String
  @State private var tab: String? = nil
  /// The deck whose ⋯ menu is open (your own profile).
  @State private var menu: String? = nil
  @State private var copied = false
  @State private var copiedTask: Task<Void, Never>? = nil
  @State private var err = ""
  @State private var makeErr = ""
  @State private var making = false

  var body: some View {
    let you = store.myHandle, h = (handle.isEmpty ? you : handle).lowercased()
    // Yours before you have a handle: your profile is made once, then the page shows it.
    let makingNow = h.isEmpty && handle.isEmpty
    let data = h.isEmpty ? nil : store.shownProfile(h)
    let missing = data?.isMissing ?? false, offline = data?.isOffline ?? false, pr = data?.value
    let isSelf = pr?.me.map(\.isSelf) ?? (makingNow || (!h.isEmpty && h == you))
    let loading = data == nil && makeErr.isEmpty && (!h.isEmpty || makingNow)
    ScrollView(showsIndicators: false) {
      VStack(alignment: .leading, spacing: 16) {
        header(h, ok: pr != nil, isSelf: isSelf)
        if loading { loadingLook }
        if missing { NetMissing(title: "No one has that name", line: "@" + h) { nav.pick(.discover) } }
        if offline { box { CSSText("Couldn’t reach Lucida. Check your connection.", 15, color: t.muted, align: .center) } }
        if !makeErr.isEmpty {
          box {
            VStack(spacing: 14) {
              CSSText(makeErr, 15, color: t.muted, align: .center)
              Pill(label: "Try again", inv: true) { makeErr = ""; making = false; make(makingNow) }
            }
          }
        }
        if let pr { page(pr, h: h, isSelf: isSelf) }
      }
      .padding(.horizontal, 20).padding(.top, Screen.top(64)).padding(.bottom, 120)
      .overlayPreferenceValue(PinAnchors.self) { anchors in pinMenu(anchors, pr, h: h) }
    }
    .ignoresSafeArea(edges: .top)
    .toolbar(.hidden, for: .navigationBar)
    .onAppear {
      if store.demo, tab == nil { tab = store.props.profileTab }
      make(makingNow)
      openEditIfWanted(pr != nil && isSelf)
    }
    .onChange(of: pr != nil) { _, ok in openEditIfWanted(ok && isSelf) }
    .onDisappear { copiedTask?.cancel() }
  }

  /// Your profile the first time: made once (profile.ensure); the library then has its handle.
  private func make(_ makingNow: Bool) {
    guard makingNow, !making, !store.demo else { return }
    making = true
    Task {
      do { try await store.ensureProfile() }
      catch { makeErr = error.localizedDescription.nilIfEmpty ?? "Something went wrong. Try again." }
    }
  }

  /// Edit profile from Settings (or the board with it open) opens once your profile is showing.
  private func openEditIfWanted(_ ok: Bool) {
    guard ok, nav.wantsEdit || (store.demo && store.props.editOpen) else { return }
    nav.wantsEdit = false; store.props.editOpen = false
    nav.sheet = .editProfile
  }

  // ---------- the parts ----------
  /// Back (someone else's), the handle, Share, and your gear (Settings).
  private func header(_ h: String, ok: Bool, isSelf: Bool) -> some View {
    HStack(spacing: 10) {
      if !isSelf { RoundButton(icon: "back", label: "Back") { nav.back() } }
      Text(h.isEmpty ? "" : "@" + h).css(20, .bold, ls: -0.02).foregroundStyle(t.text).lineLimit(1).truncationMode(.tail).line(20)
        .frame(maxWidth: .infinity, alignment: .leading)
      if ok { RoundButton(icon: "share", label: "Share profile") { share(h) } }
      if isSelf { RoundButton(icon: "gear", label: "Settings") { nav.push(.settings) } }
    }
    .frame(minHeight: 44)
  }

  private func page(_ pr: ProfilePage, h: String, isSelf: Bool) -> some View {
    let feat = pr.featured, following = pr.me?.following ?? false
    // Pinned decks first, in the order you pinned them (up to 3).
    let rank = { (d: NetDeck) in feat.firstIndex(of: d.id) ?? 99 }
    let list = pr.decks.enumerated().sorted { (rank($0.element), $0.offset) < (rank($1.element), $1.offset) }.map(\.element)
    let decks = list.map { d -> TileVM in
      var x = TileVM(d, pinned: feat.contains(d.id))
      // On your own profile, a deck only people with its link can open says so.
      if isSelf && d.visibility == "link" && x.badge.isEmpty { x.badge = "Link only"; x.badgeShield = false }
      return x
    }
    let saved = isSelf ? pr.saved.map { TileVM($0) } : []
    let current = isSelf ? tab ?? "Decks" : "Decks"
    let name = isSelf ? store.myName : pr.name
    let line = [pr.subject, pr.school].filter { !$0.isEmpty }.joined(separator: " · ")
    return Group {
      HStack(spacing: 20) {
        if isSelf { Avatar(size: 84, initial: store.avatarInitial, color: store.avatarColor, pic: store.avatar) } else { PersonAvatar(p: pr.person, size: 84) }
        HStack(spacing: 0) {
          count(NetFmt.k(decks.count), "Decks")
          count(NetFmt.k(pr.followers), "Followers")
          count(NetFmt.k(pr.following), "Following")
        }
        .frame(maxWidth: .infinity)
      }
      VStack(alignment: .leading, spacing: 3) {
        HStack(spacing: 6) { Text(name).css(16, .semibold).lineLimit(1); VerifiedMark(p: pr.person) }.line(16)
        if !line.isEmpty { CSSText(line, 14, color: t.muted) }
        if !pr.bio.isEmpty { CSSText(pr.bio, 15, lh: 1.4, color: t.text) }
      }
      .foregroundStyle(t.text)
      HStack(spacing: 8) {
        if isSelf { wide("Edit profile") { nav.sheet = .editProfile } }
        else { wide(following ? "Following" : "Follow", inv: !following) { toggleFollow(pr, h: h) }.accessibilityAddTraits(following ? .isSelected : []) }
        wide(copied ? "Link copied" : "Share profile") { share(h) }
      }
      if !err.isEmpty { CSSText(err, 13, color: t.again) }
      if isSelf { tabs(current) } else { Rectangle().fill(t.line).frame(height: 1).padding(.horizontal, -20) }
      switch current {
      case "Saved":
        if saved.isEmpty { empty("No saved decks yet") { Pill(label: "Discover decks", inv: true) { nav.pick(.discover) } } }
        else { grid(saved) { d in savedCell(d) } }
      case "Suggestions": sentList()
      default:
        if decks.isEmpty { empty("No public decks yet") { if isSelf { Pill(label: "Open Library", inv: true) { nav.pick(.library) } } } }
        else { grid(decks) { d in deckCell(d, isSelf: isSelf) } }
      }
    }
  }

  private func count(_ n: String, _ label: String) -> some View {
    VStack(spacing: 2) {
      Text(n).css(18, .bold).foregroundStyle(t.text).line(18)
      Text(label).css(13).foregroundStyle(t.muted).lineLimit(1).line(13)
    }
    .frame(maxWidth: .infinity)
    .accessibilityElement(children: .combine)
  }

  /// A button half the row wide, 44 tall (gray, or black `inv`).
  private func wide(_ label: String, inv: Bool = false, _ action: @escaping () -> Void) -> some View {
    Button(action: action) {
      Text(label).css(15, .semibold).lineLimit(1).foregroundStyle(inv ? t.invText : t.text)
        .frame(maxWidth: .infinity).frame(height: 44).background(Capsule().fill(inv ? t.inv : t.surf))
        .animation(.easeOut(duration: 0.15), value: inv)
    }
    .buttonStyle(.press)
  }

  /// Your profile's tabs: Decks, Saved, and Suggestions, as icons (the chosen one dark, with a line under it).
  private func tabs(_ current: String) -> some View {
    HStack(spacing: 0) {
      ForEach([("Decks", "grid"), ("Saved", "star"), ("Suggestions", "message")], id: \.0) { id, icon in
        let on = id == current
        Button { tab = id; menu = nil } label: {
          Icon(icon, 21, 1.8).foregroundStyle(on ? t.text : t.muted)
            .frame(maxWidth: .infinity).frame(height: 48)
            .overlay(alignment: .bottom) { Rectangle().fill(on ? t.text : .clear).frame(height: 2) }
            .contentShape(Rectangle())
        }
        .buttonStyle(.flat)
        .accessibilityLabel(id)
        .accessibilityAddTraits(on ? .isSelected : [])
      }
    }
    .background(alignment: .bottom) { Rectangle().fill(t.line).frame(height: 1) }
    .padding(.horizontal, -20)
  }

  private func grid<Cell: View>(_ decks: [TileVM], @ViewBuilder cell: @escaping (TileVM) -> Cell) -> some View {
    LazyVGrid(columns: [GridItem(.flexible(), spacing: 12, alignment: .top), GridItem(.flexible(), alignment: .top)], alignment: .leading, spacing: 12) {
      ForEach(decks) { cell($0) }
    }
  }

  /// A deck you share: its tile; on your own profile, ⋯ in its corner to pin it.
  private func deckCell(_ d: TileVM, isSelf: Bool) -> some View {
    Button { menu = nil; nav.deckPage(d.url) } label: { NetTile(d: d, height: 220) }
      .buttonStyle(.press)
      .overlay(alignment: .topTrailing) {
        if isSelf {
          Button { menu = menu == d.id ? nil : d.id } label: {
            Icon("more", 16, 2).foregroundStyle(d.mesh.inkColor).frame(width: 30, height: 30)
              .background(Circle().fill(d.mesh.glass.color))
              .overlay(Circle().strokeBorder(d.mesh.glassLine.color, lineWidth: 1))
          }
          .buttonStyle(.press)
          .padding(12)
          .accessibilityLabel("More for \(d.name)")
        }
      }
      .anchorPreference(key: PinAnchors.self, value: .bounds) { [d.id: $0] }
  }

  private func savedCell(_ d: TileVM) -> some View {
    VStack(alignment: .leading, spacing: 8) {
      Button { nav.deckPage(d.url) } label: { NetTile(d: d, height: 200) }.buttonStyle(.press)
      if let o = d.owner { OwnerLine(p: o) { nav.profile(o.handle) } }
    }
  }

  /// ⋯ on one of your decks: Pin to profile (up to 3), or Unpin; with 3 pinned already, Pin says so.
  @ViewBuilder private func pinMenu(_ anchors: [String: Anchor<CGRect>], _ pr: ProfilePage?, h: String) -> some View {
    if let m = menu, let a = anchors[m], let pr {
      GeometryReader { g in
        let r = g[a], feat = pr.featured, pinned = feat.contains(m)
        // The left column's opens to the right of its ⋯, the right column's to the left.
        let left = r.minX < g.size.width / 2, x = left ? r.minX + 8 : r.maxX - 8 - 230
        ZStack(alignment: .topLeading) {
          Color.black.opacity(0.001).frame(width: 4000, height: 8000).offset(x: -2000, y: -4000).onTapGesture { menu = nil }
          VStack(alignment: .leading, spacing: 4) {
            if pinned {
              menuItem("Unpin") { setPins(pr, h: h, feat.filter { $0 != m }) }
            } else if feat.count < 3 {
              menuItem("Pin to profile") { setPins(pr, h: h, Array((feat + [m]).prefix(3))) }
            } else {
              HStack(alignment: .top, spacing: 10) {
                Icon("pin", 16, 1.8).padding(.top, 1)
                VStack(alignment: .leading, spacing: 2) { Text("Pin to profile").css(14); Text("3 pinned already").css(12) }
              }
              .foregroundStyle(t.muted).padding(.horizontal, 12).padding(.vertical, 9)
              .accessibilityElement(children: .combine)
            }
          }
          .padding(8)
          .frame(width: 230, alignment: .leading)
          .modifier(PopBox())
          .offset(x: x, y: r.minY + 48)
        }
      }
      .transition(.opacity)
    }
  }

  private func menuItem(_ label: String, _ action: @escaping () -> Void) -> some View {
    Button(action: action) {
      HStack(spacing: 10) { Icon("pin", 16, 1.8).foregroundStyle(t.muted); Text(label).css(14).foregroundStyle(t.text); Spacer(minLength: 0) }
        .padding(.horizontal, 12).frame(height: 38).contentShape(Rectangle())
    }
    .buttonStyle(.flat)
  }

  /// The suggestions you sent: each with its deck's color, how many changes and what you said, and what became of it.
  @ViewBuilder private func sentList() -> some View {
    let sent = store.netSent()
    if sent == nil { RoundedRectangle(cornerRadius: 20, style: .continuous).fill(t.surf).frame(height: 120).accessibilityLabel("Loading") }
    else {
      let rows = sent?.value ?? []
      if rows.isEmpty { empty("No suggestions yet") { EmptyView() } }
      else {
        VStack(spacing: 0) {
          ForEach(rows) { g in sentRow(g) }
        }
      }
    }
  }

  private func sentRow(_ g: SentSuggestion) -> some View {
    let n = g.changes.count, took = g.changes.filter { $0.status == "taken" }.count, waiting = g.changes.contains { $0.status == "open" }
    let status = waiting ? "Waiting" : took == n && n > 0 ? "Taken" : took > 0 ? "\(took) of \(n) taken" : "Skipped"
    let tone: (Color, Color) = waiting ? (t.hardTint, t.hard) : took > 0 ? (t.goodTint, t.good) : (t.surf, t.muted)
    let deck = g.deck?.name ?? "A deck that isn’t shared now", mesh = Mesh.gen(g.deck?.name ?? "Lucida", "mix")
    let line = [n == 1 ? "1 change" : "\(n) changes", g.message].filter { !$0.isEmpty }.joined(separator: " · ")
    return Button { nav.deckPage(g.deck?.url.nilIfEmpty ?? "/d/" + g.sharedId) } label: {
      HStack(spacing: 12) {
        CSSLinearGradient(angle: mesh.angle, stops: mesh.stops).frame(width: 36, height: 36).clipShape(RoundedRectangle(cornerRadius: 12, style: .continuous))
        VStack(alignment: .leading, spacing: 3) {
          Text(deck).css(15, .semibold).foregroundStyle(t.text).lineLimit(1).line(15)
          Text(line).css(13).foregroundStyle(t.muted).lineLimit(1).line(13)
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        Text(status).css(12, .semibold).lineLimit(1).fixedSize().foregroundStyle(tone.1).padding(.horizontal, 10).frame(height: 26).background(Capsule().fill(tone.0))
      }
      .padding(.vertical, 10).frame(minHeight: 63)
      .padding(.bottom, 1)
      .overlay(alignment: .bottom) { Rectangle().fill(t.line).frame(height: 1) }
      .contentShape(Rectangle())
    }
    .buttonStyle(.flat)
  }

  /// A tab with nothing in it yet, and what to do about it.
  private func empty<Action: View>(_ text: String, @ViewBuilder action: () -> Action) -> some View {
    VStack(spacing: 14) {
      CSSText(text, 15, color: t.muted, align: .center)
      action()
    }
    .multilineTextAlignment(.center)
    .frame(maxWidth: .infinity)
    .padding(.horizontal, 20).padding(.vertical, 40)
    .background(RoundedRectangle(cornerRadius: 22, style: .continuous).fill(t.surf))
  }

  private func box<C: View>(@ViewBuilder _ c: () -> C) -> some View {
    c().multilineTextAlignment(.center).frame(maxWidth: .infinity).padding(.horizontal, 20).padding(.vertical, 40)
      .background(RoundedRectangle(cornerRadius: 24, style: .continuous).fill(t.surf))
  }

  /// While a profile loads: soft gray shapes where its picture, name, and decks will be.
  private var loadingLook: some View {
    let b = { (w: CGFloat?, h: CGFloat, r: CGFloat) in RoundedRectangle(cornerRadius: r, style: .continuous).fill(t.surf).frame(width: w, height: h) }
    return VStack(alignment: .leading, spacing: 16) {
      HStack(spacing: 20) {
        b(84, 84, 42)
        GeometryReader { g in VStack(alignment: .leading, spacing: 10) { b(g.size.width, 18, 9); b(g.size.width * 0.7, 14, 7) } }.frame(height: 42)
      }
      GeometryReader { g in b(g.size.width * 0.55, 16, 8) }.frame(height: 16)
      b(nil, 44, 22).frame(maxWidth: .infinity)
      HStack(spacing: 12) { b(nil, 220, 20).frame(maxWidth: .infinity); b(nil, 220, 20).frame(maxWidth: .infinity) }
    }
    .accessibilityElement(children: .ignore)
    .accessibilityLabel("Loading")
  }

  // ---------- what the buttons do ----------
  private func toggleFollow(_ pr: ProfilePage, h: String) {
    let on = !(pr.me?.following ?? false)
    err = ""; menu = nil
    Task {
      do { try await store.changeProfile(h, ProfilePatch(following: on, followers: max(0, pr.followers + (on ? 1 : -1)))) { try await store.follow(pr.handle, on) } }
      catch { err = error.localizedDescription.nilIfEmpty ?? "Something went wrong. Try again." }
    }
  }
  private func setPins(_ pr: ProfilePage, h: String, _ next: [String]) {
    err = ""; menu = nil
    Task {
      do { try await store.changeProfile(h, ProfilePatch(featured: next)) { try await store.updateProfile(["featured": next]) } }
      catch { err = error.localizedDescription.nilIfEmpty ?? "Something went wrong. Try again." }
    }
  }
  /// Share copies the profile's link, and says so for a moment.
  private func share(_ h: String) {
    UIPasteboard.general.string = store.shareLink("/@" + h)
    copied = true
    copiedTask?.cancel()
    copiedTask = Task { try? await Task.sleep(nanoseconds: 2_000_000_000); if !Task.isCancelled { copied = false } }
  }
}

/// Where each of your decks' tiles is, for its ⋯ menu.
private struct PinAnchors: PreferenceKey {
  static let defaultValue: [String: Anchor<CGRect>] = [:]
  static func reduce(value: inout [String: Anchor<CGRect>], nextValue: () -> [String: Anchor<CGRect>]) { value.merge(nextValue()) { $1 } }
}

/// pill(): a 36-tall round button, black (`inv`) or gray, 14px.
struct Pill: View {
  @Environment(\.theme) private var t
  let label: String
  var icon: String? = nil
  var inv = false
  var height: CGFloat = 36
  let action: () -> Void
  var body: some View {
    Button(action: action) {
      HStack(spacing: 8) { if let icon { Icon(icon, 16, 2) }; Text(label).css(14, .semibold).lineLimit(1) }
        .foregroundStyle(inv ? t.invText : t.text).padding(.horizontal, 16).frame(height: height)
        .background(Capsule().fill(inv ? t.inv : t.surf))
    }
    .buttonStyle(.press)
  }
}

// ---------- Edit profile ----------
/// Edit profile (EDIT_SHEET): your picture (Settings' own choices, which save as you pick), your name (the one in
/// Settings), handle, bio (160 letters), school, and subject. Save sends the rest; a handle someone has says so under
/// the handle, and one that isn't a handle says so as you type.
struct EditProfileSheet: View {
  @Environment(\.theme) private var t
  @EnvironmentObject private var store: Store
  @EnvironmentObject private var nav: Nav
  @StateObject private var keyboard = Keyboard()
  @State private var draft: [String: String] = [:]
  @State private var handleErr: String? = nil
  @State private var saveErr = ""
  @State private var saving = false
  /// Whether someone has the handle being typed, asked a moment after you stop typing.
  @State private var checking: Task<Void, Never>? = nil
  @FocusState private var focus: String?

  var body: some View {
    let h = store.myHandle, pr = store.shownProfile(h)?.value
    let was = ["name": store.myName, "handle": pr?.handle ?? h, "bio": pr?.bio ?? "", "school": pr?.school ?? "", "subject": pr?.subject ?? ""]
    let value = { (k: String) in draft[k] ?? was[k] ?? "" }
    let hv = handleValue(value("handle")), handleOk = hv.range(of: "^[a-z0-9_.]{3,30}$", options: .regularExpression) != nil
    let handleMsg = !handleOk ? "Use 3 to 30 letters, numbers, dots, or underscores." : handleErr ?? ""
    let off = saving || !handleOk
    VStack(spacing: 14) {
      Grabber()
      ZStack {
        Text("Edit profile").css(17, .semibold)
        HStack {
          Button { close() } label: { Text("Cancel").css(16).foregroundStyle(t.muted).frame(minHeight: 44) }.buttonStyle(.flat)
          Spacer()
          Button { save(was, hv, off) } label: { Text(saving ? "Saving…" : "Save").css(16, .semibold).foregroundStyle(off ? t.muted : t.text).frame(minHeight: 44) }
            .buttonStyle(.flat)
            .accessibilityAddTraits(off ? [] : .isButton)
        }
      }
      ScrollViewReader { proxy in
        ScrollView(showsIndicators: false) {
          VStack(alignment: .leading, spacing: 14) {
            VStack(spacing: 14) {
              Avatar(size: 64, initial: store.avatarInitial, color: store.avatarColor, pic: store.avatar)
              PhotoChoices()
            }
            .frame(maxWidth: .infinity)
            .padding(16)
            .background(RoundedRectangle(cornerRadius: 20, style: .continuous).fill(t.surf))
            line("Name", "name", value, max: 60).id("name")
            VStack(alignment: .leading, spacing: 8) {
              label("Handle")
              HStack(spacing: 1) {
                Text("@").css(16).foregroundStyle(t.muted)
                TextField("", text: binding("handle", value, max: 31))
                  .font(.geist(16)).foregroundStyle(t.text).textInputAutocapitalization(.never).autocorrectionDisabled()
                  .focused($focus, equals: "handle")
                  .accessibilityLabel("Handle")
              }
              .padding(.horizontal, 16).frame(height: 46)
              .background(RoundedRectangle(cornerRadius: 16, style: .continuous).fill(t.surf))
              .overlay(RoundedRectangle(cornerRadius: 16, style: .continuous).strokeBorder(handleMsg.isEmpty ? .clear : t.again, lineWidth: 2))
              if !handleMsg.isEmpty { CSSText(handleMsg, 13, color: t.again).accessibilityAddTraits(.isStaticText) }
            }
            .id("handle")
            VStack(alignment: .leading, spacing: 8) {
              HStack(alignment: .firstTextBaseline) {
                label("Bio")
                Spacer()
                Text("\(value("bio").utf16.count)/160").css(12, mono: true).foregroundStyle(t.muted)
              }
              TextField("", text: binding("bio", value, max: 160), axis: .vertical)
                .lineLimit(3, reservesSpace: true)
                // The board's lines are the browser's own (its `font: inherit` comes after the line height).
                .font(.geist(16)).foregroundStyle(t.text).lineSpacing(normalLine(16) - 16 * GEIST_LINE)
                .focused($focus, equals: "bio")
                .padding(.horizontal, 16).padding(.vertical, 12 + (normalLine(16) - 16 * GEIST_LINE) / 2)
                .background(RoundedRectangle(cornerRadius: 16, style: .continuous).fill(t.surf))
                .accessibilityLabel("Bio")
            }
            .id("bio")
            line("School", "school", value, max: 60).id("school")
            line("Subject or course", "subject", value, max: 60).id("subject")
            if !saveErr.isEmpty { CSSText(saveErr, 13, color: t.again) }
          }
          .padding(.bottom, keyboard.height > 0 ? keyboard.height : 0)
        }
        .scrollDismissesKeyboard(.interactively)
        .onChange(of: focus) { _, f in
          guard let f else { return }
          DispatchQueue.main.asyncAfter(deadline: .now() + 0.35) { withAnimation(.out(0.3)) { proxy.scrollTo(f, anchor: UnitPoint(x: 0.5, y: 0.3)) } }
        }
      }
    }
    .foregroundStyle(t.text)
    .padding(.top, 10).padding(.horizontal, 20).padding(.bottom, 34)
    .onChange(of: hv) { _, v in check(v, was: was["handle"] ?? "", ok: handleOk) }
    .onDisappear { checking?.cancel() }
  }

  /// A handle someone has says so as you type (the server's own words), a moment after you stop.
  private func check(_ v: String, was: String, ok: Bool) {
    checking?.cancel()
    guard ok, v != was else { return }
    checking = Task {
      try? await Task.sleep(nanoseconds: 450_000_000)
      guard !Task.isCancelled else { return }
      let taken: Bool
      if store.demo { taken = NetSample.shared.P.values.contains { $0.handle == v && $0.handle != "alexkim" } }
      else { taken = ((try? await store.api.get("api/public/profile?h=" + v))?.status ?? 404) == 200 }
      guard !Task.isCancelled, handleValue(draft["handle"] ?? was) == v else { return }
      if taken { handleErr = "That name is taken. Try another." }
    }
  }

  private func label(_ s: String) -> some View { Text(s).css(13, .semibold).line(13) }
  private func handleValue(_ s: String) -> String {
    var v = s.trimmingCharacters(in: .whitespacesAndNewlines)
    while v.hasPrefix("@") { v.removeFirst() }
    return v.lowercased()
  }
  private func binding(_ k: String, _ value: @escaping (String) -> String, max: Int) -> Binding<String> {
    Binding(get: { value(k) }, set: { v in
      draft[k] = v.limited(max)
      if k == "handle" { handleErr = nil }
    })
  }
  private func line(_ title: String, _ k: String, _ value: @escaping (String) -> String, max: Int) -> some View {
    VStack(alignment: .leading, spacing: 8) {
      label(title)
      TextField("", text: binding(k, value, max: max))
        .font(.geist(16)).foregroundStyle(t.text)
        .focused($focus, equals: k)
        .padding(.horizontal, 16).frame(height: 46)
        .background(RoundedRectangle(cornerRadius: 16, style: .continuous).fill(t.surf))
        .accessibilityLabel(title)
    }
  }

  /// Closing also brings your public picture up to date with the one you picked.
  private func close() {
    nav.close()
    if !store.demo { Task { _ = try? await store.ensureProfile() } }
  }

  private func save(_ was: [String: String], _ hv: String, _ off: Bool) {
    guard !off else { return }
    var patch: [String: Any] = [:], shown = ProfilePatch()
    for k in ["bio", "school", "subject"] {
      if let v = draft[k], v != was[k] { patch[k] = v }
    }
    if hv != was["handle"] { patch["handle"] = hv }
    let nm = String((draft["name"] ?? was["name"] ?? "").trimmingCharacters(in: .whitespacesAndNewlines).prefix(60))
    shown.bio = patch["bio"] as? String; shown.school = patch["school"] as? String; shown.subject = patch["subject"] as? String
    shown.name = nm.isEmpty ? was["name"] : nm
    saving = true; saveErr = ""; handleErr = nil
    Task {
      // Your name is the one in Settings: it saves first, so your profile takes it.
      if !nm.isEmpty && nm != was["name"] { await store.setSetting(["name": nm])?.value }
      do {
        let h0 = store.myHandle
        try await store.changeProfile(h0, shown) { try await store.updateProfile(patch) }
        saving = false
        nav.close()
      } catch {
        let m = error.localizedDescription.nilIfEmpty ?? "Something went wrong. Try again."
        saving = false
        if m.range(of: "taken|letters, numbers", options: [.regularExpression, .caseInsensitive]) != nil { handleErr = m } else { saveErr = m }
      }
    }
  }
}

extension String {
  /// At most `n` UTF-16 units, like a web field's maxlength (without cutting a letter in two).
  func limited(_ n: Int) -> String {
    guard utf16.count > n else { return self }
    var out = ""
    for ch in self { if out.utf16.count + String(ch).utf16.count > n { break }; out.append(ch) }
    return out
  }
}
