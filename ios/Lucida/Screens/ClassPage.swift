// iPhone · A class's page (PhoneClass, PhoneClassMember, PhoneClassNew, PhoneClassInvite, PhoneClassLoading,
// PhoneClassMissing, and the Dark and Gray twins). For someone who isn't in the class it's the invite: its colors, whose it
// is, how many people and decks, and Join. For people in it: its assignments (what's left for you, or for the owner and
// helpers, how many who share are done), the progress of each member who chose to share it ("Not shared" for the rest),
// its decks (Study one, and it joins your library), its invite (the code, Copy invite link, Share to Google Classroom),
// whether you share your progress, Get verified, its people, and Rename, Delete, or Leave. Adding a deck, assigning one,
// reporting, and Get verified are sheets (ClassSheets.swift).
import SwiftUI

/// Where each ⋯ button is, so its menu opens beside it.
private struct ClassMenuAnchors: PreferenceKey {
  static let defaultValue: [String: Anchor<CGRect>] = [:]
  static func reduce(value: inout [String: Anchor<CGRect>], nextValue: () -> [String: Anchor<CGRect>]) { value.merge(nextValue()) { $1 } }
}

/// A row in a ⋯ menu.
private struct MenuRow { let label: String; var danger = false; let action: () -> Void }

/// A question before something that can't be undone.
private struct Ask { let title: String; var message: String? = nil; let button: String; let action: () -> Void }

struct ClassScreen: View {
  @Environment(\.theme) private var t
  @EnvironmentObject private var store: Store
  @EnvironmentObject private var nav: Nav
  let code: String
  @State private var err = ""
  @State private var menu: String? = nil
  @State private var sel: String? = nil
  @State private var allPeople = false
  @State private var copied = false
  @State private var copiedTask: Task<Void, Never>? = nil
  @State private var ask: Ask? = nil
  @State private var opened = false

  private var upper: String { code.uppercased() }

  var body: some View {
    let answer = store.netClass(upper)
    let missing = answer?.isMissing == true || answer?.isOffline == true
    let k = missing ? nil : answer?.value
    ScrollView(showsIndicators: false) {
      VStack(alignment: .leading, spacing: 18) {
        if answer == nil { NetLoading(rows: 2) }
        if missing { notThere }
        if let k { if k.invite { invite(k) } else { page(k) } }
      }
      .padding(.horizontal, 20).padding(.top, Screen.top(60)).padding(.bottom, 120)
      .overlayPreferenceValue(ClassMenuAnchors.self) { anchors in menuOverlay(anchors, k) }
    }
    .ignoresSafeArea(edges: .top)
    .toolbar(.hidden, for: .navigationBar)
    .debugScroll()
    .onAppear { openDemoSheets(k) }
    .onChange(of: k?.id) { _, _ in openDemoSheets(k) }
    .onDisappear { copiedTask?.cancel() }
    .confirmationDialog(ask?.title ?? "", isPresented: Binding(get: { ask != nil }, set: { if !$0 { ask = nil } }), titleVisibility: .visible) {
      if let a = ask { Button(a.button, role: .destructive) { a.action() } }
    } message: { if let m = ask?.message { Text(m) } }
  }

  /// The design screens with a sheet open (the canvas's Tweaks) open it once the class is showing.
  private func openDemoSheets(_ k: ClassPage?) {
    guard store.demo, !opened, let k, !k.invite else { return }
    let p = store.props
    if p.classPanel == "add" { opened = true; nav.sheet = .classAdd(upper) }
    else if p.classPanel == "assign" { opened = true; nav.sheet = .classAssign(upper) }
    else if p.classReport, let d = k.deckList.first { opened = true; nav.sheet = .report(kind: "deck", id: d.id, name: d.deck.name) }
    else if p.classVerify { opened = true; nav.sheet = .verify }
  }

  /// Something that changes the class: what the server says when it didn't work shows at the top of the page.
  private func run(_ f: @escaping () async throws -> Void, then: (() -> Void)? = nil) {
    err = ""
    Task {
      do { try await f(); then?() }
      catch { err = error.localizedDescription.nilIfEmpty ?? "Something went wrong. Try again." }
    }
  }

  // ---------- not there, and the invite ----------
  /// CLASS_MISSING: a mistyped code, or a class that was deleted.
  private var notThere: some View {
    VStack(spacing: 10) {
      Text("No class has that code").css(20, .semibold).line(20)
      Text("Check the link, or ask for a new one.").css(14).foregroundStyle(t.muted).line(14)
      Button { nav.back() } label: {
        Text("Your classes").css(14, .semibold).foregroundStyle(t.invText).padding(.horizontal, 16).frame(height: 36).background(Capsule().fill(t.inv))
      }
      .buttonStyle(.press)
      .padding(.top, 6)
    }
    .foregroundStyle(t.text)
    .multilineTextAlignment(.center)
    .frame(maxWidth: .infinity)
    .padding(.horizontal, 24).padding(.vertical, 64)
    .background(RoundedRectangle(cornerRadius: 24, style: .continuous).fill(t.surf))
  }

  /// The invite: the class's colors, whose it is, how many people and decks, and Join.
  private func invite(_ k: ClassPage) -> some View {
    let mesh = Mesh.gen(k.name.isEmpty ? "Class" : k.name, "mix")
    return VStack(alignment: .leading, spacing: 18) {
      HStack(spacing: 8) { LibRound(icon: "back", label: "Classes") { nav.back() }; Spacer(minLength: 0) }
      VStack(alignment: .leading, spacing: 18) {
        ZStack(alignment: .topLeading) {
          MeshFill(mesh: mesh)
          VStack(alignment: .leading, spacing: 0) {
            HStack(spacing: 0) { if k.official { GlassChip(text: "Official", shield: true) } }.frame(minHeight: 24, alignment: .leading)
            Spacer(minLength: 0)
            VStack(alignment: .leading, spacing: 6) {
              LabelText(text: Rich.nsText([.init(t: k.name, m: "")], size: 32, weight: .semibold, ls: -0.03, lh: 1.05, color: UIColor(mesh.inkColor), dark: false))
              Text(k.school).css(15).line(15).opacity(0.88)
            }
            .shadow(color: .black.opacity(mesh.shadow), radius: mesh.shadow > 0 ? 7 : 0, x: 0, y: mesh.shadow > 0 ? 1 : 0)
          }
          .foregroundStyle(mesh.inkColor)
          .padding(.horizontal, 24).padding(.vertical, 22)
          .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .topLeading)
        }
        .frame(height: 220)
        .clipShape(RoundedRectangle(cornerRadius: 28, style: .continuous))
        .accessibilityElement(children: .ignore)
        .accessibilityLabel([k.name, k.school].filter { !$0.isEmpty }.joined(separator: ", "))
        Button { nav.profile(k.owner.handle) } label: {
          HStack(spacing: 12) {
            PersonAvatar(p: k.owner, size: 40)
            VStack(alignment: .leading, spacing: 2) {
              HStack(spacing: 6) { Text(k.owner.name).css(15, .semibold).lineLimit(1); VerifiedMark(p: k.owner) }.line(15)
              Text(ClassWords.nOf(k.people, "person", "people") + " · " + ClassWords.nOf(k.decks, "deck")).css(13).foregroundStyle(t.muted).line(13)
            }
            Spacer(minLength: 0)
          }
          .foregroundStyle(t.text)
          .contentShape(Rectangle())
        }
        .buttonStyle(.flat)
        Button { run { _ = try await store.joinClass(upper) } } label: {
          Text("Join").css(16, .semibold).foregroundStyle(t.invText).frame(maxWidth: .infinity).frame(height: 52).background(Capsule().fill(t.inv))
        }
        .buttonStyle(.press)
        if !err.isEmpty { CSSText(err, 14, color: t.again, align: .center).frame(maxWidth: .infinity) }
      }
      .padding(.top, 12)
    }
  }

  // ---------- the class, for the people in it ----------
  private func page(_ k: ClassPage) -> some View {
    let role = k.me?.role ?? "", staff = role == "owner" || role == "helper", owner = role == "owner"
    let learners = k.members.filter { $0.role == "member" }
    let verified = !store.netVerify().verified.isEmpty
    let today = store.classToday
    return VStack(alignment: .leading, spacing: 18) {
      HStack(spacing: 8) {
        LibRound(icon: "back", label: "Classes") { nav.back() }
        Spacer(minLength: 0)
        if staff {
          LibRound(icon: "plus", label: "Add a deck") { nav.sheet = .classAdd(upper) }
          LibRound(icon: "calendar", label: "Assign", inv: true) { nav.sheet = .classAssign(upper) }
        }
      }
      heading(k)
      ClassErrBox(text: err)
      if role == "member" && !(k.me?.asked ?? false) { askShare(k) }
      assignments(k, staff: staff, role: role, learners: learners, today: today)
      if staff && !k.assignments.isEmpty { progress(k, learners: learners) }
      decks(k, staff: staff, owner: owner, verified: verified)
      inviteCard(k)
      if role == "member" { shareRow(k) }
      if staff && !verified { verifyRow }
      people(k, staff: staff, owner: owner)
      HStack(spacing: 8) {
        if owner {
          SmallButton(label: "Rename", icon: "pencil") { nav.sheet = .classForm(.rename(id: k.id, name: k.name, school: k.school)) }
          DangerButton(label: "Delete class") {
            ask = Ask(title: "Delete “\(k.name)”?", message: "Everyone in it keeps the decks they study.", button: "Delete class") {
              run({ try await store.deleteClass(k.id) }, then: { nav.back() })
            }
          }
        }
        if !owner {
          DangerButton(label: "Leave class") {
            ask = Ask(title: "Leave “\(k.name)”?", message: "The decks you study from it stay in your library.", button: "Leave class") {
              run({ try await store.leaveClass(k.id) }, then: { nav.back() })
            }
          }
        }
      }
      .padding(.top, 6)
    }
  }

  /// Its name, and whose it is with its school and how many people.
  private func heading(_ k: ClassPage) -> some View {
    VStack(alignment: .leading, spacing: 8) {
      HStack(spacing: 10) {
        CSSText(k.name, 32, .bold, lh: 1.1, color: t.text, ls: -0.03).accessibilityAddTraits(.isHeader)
        if k.official { Icon("shield", 20, 2).foregroundStyle(Color(hex: 0x3E63DD)).accessibilityLabel("Official") }
      }
      HStack(spacing: 8) {
        Button { nav.profile(k.owner.handle) } label: {
          HStack(spacing: 8) {
            PersonAvatar(p: k.owner, size: 22)
            Text(k.owner.name).css(14, .semibold).line(14)
          }
          .foregroundStyle(t.text)
          .contentShape(Rectangle())
        }
        .buttonStyle(.flat)
        .fixedSize()
        VerifiedMark(p: k.owner)
        Text("· " + [k.school, ClassWords.nOf(k.people, "person", "people")].filter { !$0.isEmpty }.joined(separator: " · ")).css(14).foregroundStyle(t.muted).lineLimit(1).line(14)
      }
    }
  }

  /// Asked once, right after joining: share your progress with the class's owner (and helpers)? Off unless you say so.
  private func askShare(_ k: ClassPage) -> some View {
    let seers = ClassWords.andList([k.owner.name] + k.helpers)
    return VStack(alignment: .leading, spacing: 14) {
      HStack(spacing: 14) {
        Icon("stats", 20, 1.8).foregroundStyle(t.text).frame(width: 44, height: 44).background(Circle().fill(t.bg))
        VStack(alignment: .leading, spacing: 3) {
          CSSText("Share your progress with \(seers)?", 16, .semibold, lh: 1.3, color: t.text)
          CSSText("How far you are and when you studied. Never your answers.", 13, lh: 1.4, color: t.muted)
        }
        .frame(maxWidth: .infinity, alignment: .leading)
      }
      HStack(spacing: 8) {
        ClassButton(label: "Not now", height: 44, wide: true) { run { try await store.shareProgress(k.id, false) } }
        ClassButton(label: "Share", inv: true, height: 44, wide: true) { run { try await store.shareProgress(k.id, true) } }
      }
    }
    .padding(18)
    .background(RoundedRectangle(cornerRadius: 22, style: .continuous).fill(t.surf))
    .accessibilityElement(children: .contain)
  }

  // ---------- assignments ----------
  private func assignments(_ k: ClassPage, staff: Bool, role: String, learners: [ClassMember], today: Date) -> some View {
    VStack(alignment: .leading, spacing: 0) {
      Text("Assignments").css(17, .semibold, ls: -0.01).line(17).foregroundStyle(t.text).padding(.bottom, 4).accessibilityAddTraits(.isHeader)
      ForEach(k.assignments) { a in assignmentRow(k, a, staff: staff, role: role, learners: learners, today: today) }
      if k.assignments.isEmpty { Text("Nothing assigned yet.").css(14).foregroundStyle(t.muted).line(14).padding(.vertical, 16) }
    }
  }

  private func assignmentRow(_ k: ClassPage, _ a: ClassAssignment, staff: Bool, role: String, learners: [ClassMember], today: Date) -> some View {
    let mesh = Mesh.gen(a.deck.cover.seed ?? a.deck.name, a.deck.cover.style ?? "mix")
    let mine = staff ? nil : store.classProgress(a.sharedId)
    let sharing = learners.filter(\.share), doneN = sharing.filter { ClassWords.isDone(goal: a.goal, a.progress?[$0.person.handle]) }.count
    let done = !staff && ClassWords.isDone(goal: a.goal, mine)
    let right = staff ? (sharing.isEmpty ? "" : "\(doneN) of \(sharing.count) done") : ClassWords.leftWord(goal: a.goal, cards: a.deck.cards, mine)
    let sub = ClassWords.goalWord(a.goal) + " · " + ClassWords.dueWord(a.goal, a.due, today: today)
    let key = "a:" + a.id
    return HStack(spacing: 12) {
      Button {
        if let mine { nav.push(.deck(mine.deckId)) } else { nav.open(store.webURL(a.deck.url)) }
      } label: {
        HStack(spacing: 12) {
          CSSLinearGradient(angle: mesh.angle, stops: mesh.stops).frame(width: 36, height: 36).clipShape(RoundedRectangle(cornerRadius: 12, style: .continuous))
          VStack(alignment: .leading, spacing: 2) {
            Text(a.deck.name).css(15, .semibold).lineLimit(1).line(15)
            Text(sub).css(12).foregroundStyle(t.muted).lineLimit(1).line(12)
            if !right.isEmpty { Text(right).css(12, .semibold).foregroundStyle(done ? t.good : staff ? t.muted : t.text).lineLimit(1).line(12) }
          }
          .frame(maxWidth: .infinity, alignment: .leading)
        }
        .foregroundStyle(t.text)
        .contentShape(Rectangle())
      }
      .buttonStyle(.flat)
      .accessibilityElement(children: .ignore)
      .accessibilityLabel([a.deck.name, sub, right].filter { !$0.isEmpty }.joined(separator: ", "))
      .accessibilityAddTraits(.isButton)
      if role == "member" && !done {
        if let mine {
          Button { store.startReview(mine.deckId); nav.study(deckId: mine.deckId) } label: {
            Text("Study").css(13, .semibold).foregroundStyle(t.text).padding(.horizontal, 14).frame(height: 34).background(Capsule().fill(t.surf))
          }
          .buttonStyle(.press)
          .accessibilityLabel("Study " + a.deck.name)
        } else {
          SmallButton(label: "Study") { run({ let id = try await store.studySharedDeck(a.sharedId); if !id.isEmpty { nav.push(.deck(id)) } }) }
            .accessibilityLabel("Study " + a.deck.name)
        }
      }
      if staff { moreButton(key, "More for the \(a.deck.name) assignment") }
    }
    .frame(minHeight: 64)
    .padding(.bottom, 1)
    .overlay(alignment: .bottom) { Rectangle().fill(t.line).frame(height: 1) }
  }

  // ---------- progress ----------
  private func progress(_ k: ClassPage, learners: [ClassMember]) -> some View {
    let list = k.assignments, selA = list.first { $0.id == sel } ?? list.first
    let rows = selA.map { a in (learners.filter(\.share) + learners.filter { !$0.share }).map { ($0, cell($0, a)) } } ?? []
    return VStack(alignment: .leading, spacing: 12) {
      FlowLayout(spacing: 6, lineSpacing: 6) {
        Text("Progress").css(17, .semibold, ls: -0.01).line(17).foregroundStyle(t.text).padding(.trailing, 6).accessibilityAddTraits(.isHeader)
        ForEach(list) { a in
          let on = a.id == selA?.id
          Button { sel = a.id } label: {
            Text(a.deck.name).css(13, .semibold).lineLimit(1).foregroundStyle(on ? t.invText : t.text).padding(.horizontal, 12).frame(height: 32)
              .background(Capsule().fill(on ? t.inv : t.surf))
          }
          .buttonStyle(.press)
          .accessibilityLabel("Progress on " + a.deck.name)
          .accessibilityAddTraits(on ? .isSelected : [])
        }
      }
      if !rows.isEmpty {
        VStack(spacing: 0) { ForEach(rows, id: \.0.id) { x, c in progressRow(x, c) } }
      } else if selA != nil {
        Text("No members yet.").css(14).foregroundStyle(t.muted).line(14).padding(.vertical, 16)
      }
    }
  }

  private struct Cell { var isBar = false, word = "", wordColor = Color.clear, pct: CGFloat = 0, barColor = Color.clear, meta = "" }
  /// One member's line for one assignment: how far along (a bar, for Learn every card), and how well and when.
  private func cell(_ x: ClassMember, _ a: ClassAssignment) -> Cell {
    if !x.share { return Cell(word: "Not shared", wordColor: t.muted, barColor: t.surf2) }
    guard let pr = a.progress?[x.person.handle] else { return Cell(word: "Not started", wordColor: t.muted, barColor: t.surf2) }
    let done = ClassWords.isDone(goal: a.goal, pr), daily = a.goal == "daily"
    let rem = pr.remembered.map { "\($0)%" } ?? "—", last = pr.last.map { NetFmt.ago($0, demo: store.demo) } ?? "—"
    return Cell(isBar: !daily, word: daily ? (pr.learned == 0 ? "Not started" : pr.due > 0 ? "\(pr.due) to review" : "Caught up") : "\(pr.learned) of \(pr.total)",
                wordColor: daily ? (pr.learned == 0 ? t.muted : pr.due > 0 ? t.hard : t.good) : done ? t.good : t.text,
                pct: pr.total > 0 ? CGFloat(Int((Double(pr.learned) / Double(pr.total) * 100).rounded())) / 100 : 0, barColor: done ? t.good : t.text,
                meta: [pr.remembered == nil ? "" : "Remembered " + rem, pr.last == nil ? "" : last].filter { !$0.isEmpty }.joined(separator: " · "))
  }

  private func progressRow(_ x: ClassMember, _ c: Cell) -> some View {
    Button { nav.profile(x.person.handle) } label: {
      HStack(spacing: 12) {
        PersonAvatar(p: x.person, size: 32)
        VStack(alignment: .leading, spacing: 6) {
          HStack(spacing: 8) {
            Text(x.person.name).css(15, .medium).lineLimit(1).line(15)
            Spacer(minLength: 0)
            Text(c.word).css(13, .semibold).foregroundStyle(c.wordColor).lineLimit(1).fixedSize().line(13)
          }
          if c.isBar {
            GeometryReader { g in
              ZStack(alignment: .leading) {
                Capsule().fill(t.surf2)
                Capsule().fill(c.barColor).frame(width: g.size.width * c.pct)
              }
            }
            .frame(height: 8).clipShape(Capsule())
          }
          if !c.meta.isEmpty { Text(c.meta).css(12).foregroundStyle(t.muted).lineLimit(1).line(12) }
        }
      }
      .foregroundStyle(t.text)
      // 60 tall at least, with its 1-point line inside (border-box).
      .padding(.vertical, 8).padding(.bottom, 1).frame(minHeight: 60)
      .overlay(alignment: .bottom) { Rectangle().fill(t.line).frame(height: 1) }
      .contentShape(Rectangle())
    }
    .buttonStyle(.flat)
    .accessibilityElement(children: .ignore)
    .accessibilityLabel([x.person.name, c.word, c.meta].filter { !$0.isEmpty }.joined(separator: ", "))
    .accessibilityAddTraits(.isButton)
  }

  // ---------- the class's decks ----------
  private func decks(_ k: ClassPage, staff: Bool, owner: Bool, verified: Bool) -> some View {
    VStack(alignment: .leading, spacing: 14) {
      Text("Decks").css(17, .semibold, ls: -0.01).line(17).foregroundStyle(t.text).accessibilityAddTraits(.isHeader)
      if !k.deckList.isEmpty {
        LazyVGrid(columns: [GridItem(.flexible(), spacing: 12, alignment: .top), GridItem(.flexible(), alignment: .top)], alignment: .leading, spacing: 12) {
          ForEach(k.deckList) { d in deckCell(k, d, staff: staff, owner: owner, verified: verified) }
        }
      } else {
        VStack(spacing: 12) {
          Text("No decks in this class yet.").css(15).foregroundStyle(t.muted).line(15)
          if staff { ClassButton(label: "Add a deck", icon: "plus", inv: true) { nav.sheet = .classAdd(upper) } }
        }
        .frame(maxWidth: .infinity)
        .padding(.horizontal, 20).padding(.vertical, 32)
        .background(RoundedRectangle(cornerRadius: 20, style: .continuous).fill(t.surf))
      }
    }
  }

  private func deckCell(_ k: ClassPage, _ d: ClassDeck, staff: Bool, owner: Bool, verified: Bool) -> some View {
    let nd = d.deck, tile = TileVM(nd)
    let lib = store.lib.decks.first { $0.link?.id == nd.id && $0.link?.gone == false }
    let own = store.lib.decks.first { $0.share?.id == nd.id && $0.share?.vis != "private" }
    let you = store.myHandle
    let isOwn = own != nil || (nd.owner != nil && !you.isEmpty && nd.owner?.handle == you)
    let inLib = !isOwn && (lib != nil || (store.demo && store.classProgress(nd.id) != nil))
    let key = "d:" + nd.id
    return VStack(alignment: .leading, spacing: 8) {
      Button { nav.open(store.webURL(nd.url)) } label: { NetTile(d: tile, height: 160, nameSize: 17) }
        .buttonStyle(.press)
        .overlay(alignment: .topTrailing) {
          Button { menu = menu == key ? nil : key } label: {
            Icon("more", 16, 2).foregroundStyle(.white).frame(width: 32, height: 32).background(Circle().fill(Color.black.opacity(0.28)))
          }
          .buttonStyle(.press)
          .padding(10)
          .accessibilityLabel("More for \(nd.name)")
          .anchorPreference(key: ClassMenuAnchors.self, value: .bounds) { [key: $0] }
        }
      HStack(spacing: 8) {
        Button { if let o = nd.owner { nav.profile(o.handle) } } label: {
          HStack(spacing: 8) {
            PersonAvatar(p: nd.owner ?? NetPerson(), size: 20)
            Text(nd.owner?.name ?? "").css(13, .semibold).lineLimit(1).line(13)
          }
          .foregroundStyle(t.text)
          .frame(maxWidth: .infinity, alignment: .leading)
          .contentShape(Rectangle())
        }
        .buttonStyle(.flat)
        if !isOwn && !inLib {
          SmallButton(label: "Study") { run({ let id = try await store.studySharedDeck(nd.id); if !id.isEmpty { nav.push(.deck(id)) } }) }
            .accessibilityLabel("Study " + nd.name)
        }
        if isOwn || inLib {
          Button { if let id = own?.id ?? lib?.id { nav.push(.deck(id)) } else { nav.pick(.library); nav.libClasses = false } } label: {
            Text(isOwn ? "Yours" : "Studying").css(13, .semibold).foregroundStyle(t.text).lineLimit(1).fixedSize().padding(.horizontal, 12).frame(height: 34).background(Capsule().fill(t.surf))
          }
          .buttonStyle(.press)
          .accessibilityLabel((isOwn ? "Yours: " : "Studying: ") + nd.name)
        }
      }
    }
    .accessibilityElement(children: .contain)
  }

  // ---------- the side: invite, sharing, Get verified, people ----------
  private func inviteCard(_ k: ClassPage) -> some View {
    let link = store.shareLink("/class/" + k.code)
    return VStack(alignment: .leading, spacing: 10) {
      Text("Invite").css(13, .semibold).foregroundStyle(t.muted).line(13)
      Text(k.code).css(34, .medium, ls: 0.14, lh: 1.1, mono: true).foregroundStyle(t.text)
      Text(link.replacingOccurrences(of: "^https?://", with: "", options: .regularExpression)).css(13).foregroundStyle(t.muted).lineLimit(1).truncationMode(.tail).line(13)
      VStack(spacing: 8) {
        ClassButton(label: copied ? "Copied" : "Copy invite link", icon: "link", inv: true, height: 44, wide: true) { copyInvite(link) }
        ClassButton(label: "Share to Google Classroom", icon: "share", height: 44, wide: true) { classroom(link, "Join \(k.name.isEmpty ? "my class" : k.name) on Lucida") }
      }
      .padding(.top, 4)
    }
    .padding(20)
    .frame(maxWidth: .infinity, alignment: .leading)
    .background(RoundedRectangle(cornerRadius: 24, style: .continuous).fill(t.surf))
  }

  private func shareRow(_ k: ClassPage) -> some View {
    let on = k.me?.share ?? false
    return HStack(spacing: 12) {
      VStack(alignment: .leading, spacing: 2) {
        Text("Share my progress").css(14, .semibold).line(14)
        Text("With " + ClassWords.andList([k.owner.name] + k.helpers)).css(12).foregroundStyle(t.muted).line(12)
      }
      .frame(maxWidth: .infinity, alignment: .leading)
      Toggle48(on: on, label: "Share my progress") { run { try await store.shareProgress(k.id, !on) } }
    }
    .foregroundStyle(t.text)
    .padding(.horizontal, 18).padding(.vertical, 16)
    .background(RoundedRectangle(cornerRadius: 20, style: .continuous).fill(t.surf))
  }

  private var verifyRow: some View {
    let waiting = store.netVerify().open
    return Button { nav.sheet = .verify } label: {
      HStack(spacing: 10) {
        Icon("shield", 16, 2).foregroundStyle(Color(hex: 0x3E63DD))
        Text(waiting ? "Waiting for review" : "Get verified").css(14, .semibold).line(14).frame(maxWidth: .infinity, alignment: .leading)
        Icon("chev", 14, 2).foregroundStyle(t.muted)
      }
      .foregroundStyle(t.text)
      .padding(.horizontal, 16).frame(height: 52)
      .background(RoundedRectangle(cornerRadius: 18, style: .continuous).fill(t.surf))
      .contentShape(Rectangle())
    }
    .buttonStyle(.flat)
  }

  private func people(_ k: ClassPage, staff: Bool, owner: Bool) -> some View {
    let shown = allPeople ? k.members.count : 6
    return VStack(alignment: .leading, spacing: 0) {
      HStack(alignment: .firstTextBaseline) {
        Text("People").css(17, .semibold, ls: -0.01).line(17).foregroundStyle(t.text).accessibilityAddTraits(.isHeader)
        Spacer(minLength: 0)
        Text(String(k.members.count)).css(13, mono: true).foregroundStyle(t.muted)
      }
      .padding(.horizontal, 2).padding(.bottom, 6)
      ForEach(Array(k.members.prefix(shown))) { x in personRow(k, x, staff: staff, owner: owner) }
      if k.members.count > shown {
        Button { allPeople = true } label: {
          Text("Show all \(k.members.count)").css(13, .semibold).foregroundStyle(t.text).padding(.horizontal, 12).frame(height: 34).background(Capsule().fill(t.surf))
        }
        .buttonStyle(.press)
        .padding(.top, 4)
      }
    }
    .padding(.top, 4)
  }

  private func personRow(_ k: ClassPage, _ x: ClassMember, staff: Bool, owner: Bool) -> some View {
    let canManage = staff && !x.you && x.role != "owner" && (owner || x.role == "member")
    let roleLabel = x.you ? "You" : x.role == "owner" ? "Owner" : x.role == "helper" ? "Helper" : ""
    let key = "p:" + x.person.handle
    return HStack(spacing: 10) {
      Button { nav.profile(x.person.handle) } label: {
        HStack(spacing: 10) {
          PersonAvatar(p: x.person, size: 32)
          Text(x.person.name).css(15, .medium).lineLimit(1).line(15)
          VerifiedMark(p: x.person)
          Spacer(minLength: 0)
        }
        .foregroundStyle(t.text)
        .contentShape(Rectangle())
      }
      .buttonStyle(.flat)
      .accessibilityElement(children: .ignore)
      .accessibilityLabel(x.person.name + (roleLabel.isEmpty ? "" : ", " + roleLabel))
      .accessibilityAddTraits(.isButton)
      if !roleLabel.isEmpty { Text(roleLabel).css(12, .semibold).foregroundStyle(t.muted).fixedSize().line(12) }
      if canManage { moreButton(key, "More for \(x.person.name)") }
    }
    .frame(height: 52)
  }

  // ---------- ⋯ menus ----------
  private func moreButton(_ key: String, _ label: String) -> some View {
    Button { menu = menu == key ? nil : key } label: {
      Icon("more", 16, 2).foregroundStyle(t.muted).frame(width: 32, height: 32).contentShape(Circle())
    }
    .buttonStyle(.press)
    .accessibilityLabel(label)
    .anchorPreference(key: ClassMenuAnchors.self, value: .bounds) { [key: $0] }
  }

  /// A deck's ⋯: take it out (the owner: any; a helper: the ones they added), check it (a verified teacher), share it to
  /// Google Classroom, or report it (not your own).
  private func menuRows(_ k: ClassPage, _ d: ClassDeck, isOwn: Bool, staff: Bool, owner: Bool, verified: Bool) -> [MenuRow] {
    var rows: [MenuRow] = []
    if owner || (staff && d.mine) { rows.append(MenuRow(label: "Take out of class", danger: true) { run { try await store.removeClassDeck(k.id, sharedId: d.id) } }) }
    if verified && !isOwn && !(d.deck.checked?.current ?? false) { rows.append(MenuRow(label: "Check this deck") { run { try await store.checkSharedDeck(d.id) } }) }
    rows.append(MenuRow(label: "Share to Google Classroom") { classroom(store.deckLink(d.deck.url), d.deck.name) })
    if !isOwn { rows.append(MenuRow(label: "Report") { nav.sheet = .report(kind: "deck", id: d.id, name: d.deck.name) }) }
    return rows
  }

  /// Someone's ⋯: the owner makes a member a helper (or a helper a member); the owner and helpers take someone out.
  private func personMenu(_ k: ClassPage, _ x: ClassMember, owner: Bool) -> [MenuRow] {
    var rows: [MenuRow] = []
    if owner && x.role == "member" { rows.append(MenuRow(label: "Make a helper") { run { try await store.setMember(k.id, handle: x.person.handle, role: "helper") } }) }
    if owner && x.role == "helper" { rows.append(MenuRow(label: "Make a member") { run { try await store.setMember(k.id, handle: x.person.handle, role: "member") } }) }
    rows.append(MenuRow(label: "Take out of class", danger: true) {
      ask = Ask(title: "Take \(x.person.name) out of the class?", button: "Take out of class") { run { try await store.setMember(k.id, handle: x.person.handle, remove: true) } }
    })
    return rows
  }

  /// The open menu, beside its button (its right edge under the button's), over a layer that closes it.
  @ViewBuilder private func menuOverlay(_ anchors: [String: Anchor<CGRect>], _ k: ClassPage?) -> some View {
    if let m = menu, let a = anchors[m], let k {
      GeometryReader { g in
        let r = g[a], rows = rowsFor(m, k)
        ZStack(alignment: .topLeading) {
          Color.black.opacity(0.001).frame(width: 4000, height: 8000).offset(x: -2000, y: -4000).onTapGesture { menu = nil }
          VStack(alignment: .leading, spacing: 4) {
            ForEach(Array(rows.enumerated()), id: \.offset) { _, row in
              Button { menu = nil; row.action() } label: {
                Text(row.label).css(14).foregroundStyle(row.danger ? t.again : t.text).frame(maxWidth: .infinity, alignment: .leading)
                  .padding(.horizontal, 12).frame(height: 40).contentShape(Rectangle())
              }
              .buttonStyle(.flat)
            }
          }
          .padding(8)
          .frame(width: 250, alignment: .leading)
          .modifier(PopBox())
          .offset(x: r.maxX - 250, y: r.minY + 40)
        }
      }
      .transition(.opacity)
    }
  }

  private func rowsFor(_ key: String, _ k: ClassPage) -> [MenuRow] {
    let role = k.me?.role ?? "", staff = role == "owner" || role == "helper", owner = role == "owner", verified = !store.netVerify().verified.isEmpty
    if key.hasPrefix("a:") {
      let id = String(key.dropFirst(2))
      return [MenuRow(label: "Remove assignment", danger: true) { run { try await store.unassign(k.id, assignment: id) } }]
    }
    if key.hasPrefix("d:") {
      let id = String(key.dropFirst(2))
      guard let d = k.deckList.first(where: { $0.id == id }) else { return [] }
      let own = store.lib.decks.first { $0.share?.id == d.id && $0.share?.vis != "private" }
      let isOwn = own != nil || (d.deck.owner != nil && !store.myHandle.isEmpty && d.deck.owner?.handle == store.myHandle)
      return menuRows(k, d, isOwn: isOwn, staff: staff, owner: owner, verified: verified)
    }
    let h = String(key.dropFirst(2))
    guard let x = k.members.first(where: { $0.person.handle == h }) else { return [] }
    return personMenu(k, x, owner: owner)
  }

  // ---------- the invite link ----------
  private func copyInvite(_ link: String) {
    UIPasteboard.general.string = link
    copied = true
    copiedTask?.cancel()
    copiedTask = Task { try? await Task.sleep(nanoseconds: 1_600_000_000); if !Task.isCancelled { copied = false } }
  }
  /// Google Classroom's own share page (the invite link, or a class deck's page), over the app.
  private func classroom(_ url: String, _ title: String) {
    guard !store.demo else { return }
    let q = { (s: String) in s.addingPercentEncoding(withAllowedCharacters: .alphanumerics) ?? s }
    nav.open(URL(string: "https://classroom.google.com/share?url=" + q(url) + "&title=" + q(title)))
  }
}
