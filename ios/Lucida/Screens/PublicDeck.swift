// iPhone · A shared deck's page (PhonePublicDeck, PhonePublicDeckStudying, PhonePublicDeckOwner, PhonePublicDeckCopy,
// PhonePublicDeckSuggest, PhonePublicDeckSuggestNew, and the Dark and Gray twins): what anyone opens from Discover, a
// profile, or a link. Its cover and badge, whose it is, and what you can do with it: Study it as it is, Make a copy (a
// sheet), Save it, Get its updates, and Suggest a change (a sheet); its owner gets Edit, Suggestions, and Share settings
// instead. Under it, its cards (press one for its answer), its History, and its People. Anyone but its owner can Report it
// (a sheet); a verified teacher or school gets Check this deck under the buttons (on a deck whose check isn't current),
// which then says "Checked by you" until the owner changes the deck again.
import SwiftUI

struct PublicDeckScreen: View {
  @Environment(\.theme) private var t
  @Environment(\.accessibilityReduceMotion) private var still
  @EnvironmentObject private var store: Store
  @EnvironmentObject private var nav: Nav
  let addr: DeckAddress
  @State private var tab = "Cards"
  @State private var openCard = ""
  @State private var limit = 40
  /// Saving and getting updates show as you press them (the page's answer catches up).
  @State private var star: Bool? = nil
  @State private var watch: Bool? = nil
  @State private var busy = ""
  @State private var err = ""
  /// Save and Get updates, on and off (a light tap each).
  @State private var changes = 0
  /// The version of the deck you checked (Check this deck): it says "Checked by you" until the deck changes again.
  @State private var checkedAt: Int? = nil
  /// A link's ?copy=1 or ?suggest=<card> opens its sheet once, when the page is here.
  @State private var opened = false

  var body: some View {
    let answer = store.netDeckPage(addr), page = answer?.value
    let bad = answer?.isMissing == true || answer?.isOffline == true
    ScrollView(showsIndicators: false) {
      VStack(spacing: 16) {
        if let page { ready(page) } else { notReady(loading: answer == nil && !bad, bad: bad) }
      }
      .padding(.bottom, 120)
    }
    .ignoresSafeArea(edges: .top)
    .toolbar(.hidden, for: .navigationBar)
    .onChange(of: page != nil, initial: true) { _, ok in if ok, let page { openWanted(page) } }
    .haptic(.light, on: changes, "save or updates")
  }

  /// A link that asks for Make a copy or Suggest a change opens it, for someone who can (not on your own deck).
  private func openWanted(_ p: PublicDeckPage) {
    guard !opened, let me = p.me, !me.owner else { return }
    // The Report board has its sheet open.
    if store.demo && store.props.report { opened = true; nav.sheet = .report(kind: "deck", id: p.id, name: p.deck.name); return }
    if addr.copy { opened = true; withAnimation(Motion.sheet) { nav.sheet = .copyDeck(addr.plain) } }
    else if !addr.suggest.isEmpty {
      opened = true
      SuggestModel.of(addr.plain.key).startFresh()
      withAnimation(Motion.sheet) { nav.sheet = .suggest(addr.plain, start: addr.suggest) }
    }
  }

  // ---------- before the page is here ----------
  private func notReady(loading: Bool, bad: Bool) -> some View {
    VStack(alignment: .leading, spacing: 16) {
      RoundButton(icon: "back", label: "Back") { nav.back() }
      if loading { NetLoading(rows: 2) }
      if bad { NetMissing(title: "This deck isn’t here", line: "It may be private now, or the link is wrong.") { nav.pick(.discover) } }
    }
    .frame(maxWidth: .infinity, alignment: .leading)
    .padding(.horizontal, 20).padding(.top, Screen.top(64))
  }

  // ---------- the page ----------
  private func ready(_ p: PublicDeckPage) -> some View {
    let d = p.deck, me = p.me, owns = me?.owner ?? false, learner = me != nil && !owns
    let mine = owns && !store.demo ? store.libraryDeck(sharedId: d.id) : nil
    let studying = me?.studying ?? "", copied = me?.copied ?? ""
    let starOn = star ?? (me?.starred ?? false), watchOn = watch ?? (me?.watching ?? false)
    let ownerName = d.owner?.name ?? "", owner = d.owner ?? NetPerson()
    let people = peopleRows(p)
    // Check this deck is for a verified teacher or school, on a deck whose check isn't current; once they press it, it says
    // "Checked by you" (until the deck changes again: then its check is old and the button comes back).
    let checkedNow = d.checked?.current ?? false, checker = learner && !store.netVerify().verified.isEmpty
    let mineChecked = learner && (checkedAt == d.version || (checkedNow && !store.myHandle.isEmpty && d.checked?.handle == store.myHandle))
    let canCheck = checker && !checkedNow && !mineChecked
    return VStack(spacing: 16) {
      cover(p, watchOn: watchOn, showWatch: learner && studying.isEmpty, canReport: !owns)
      VStack(alignment: .leading, spacing: 16) {
        if learner {
          HStack(spacing: 10) {
            if studying.isEmpty {
              Button { study(p) } label: {
                Text(busy == "study" ? "Adding…" : "Study").css(17, .semibold).lineLimit(1).foregroundStyle(t.invText)
                  .frame(maxWidth: .infinity).frame(height: 56).background(Capsule().fill(t.inv))
              }
              .buttonStyle(.press)
            } else {
              Button { nav.openDeck(studying) } label: {
                HStack(spacing: 8) { Icon("check", 18, 2.4); Text("Studying").css(17, .semibold) }
                  .foregroundStyle(t.invText).frame(maxWidth: .infinity).frame(height: 56).background(Capsule().fill(t.inv))
              }
              .buttonStyle(.press)
            }
            if copied.isEmpty { round("copy", "Make a copy") { withAnimation(Motion.sheet) { nav.sheet = .copyDeck(addr.plain) } } }
            else { round("copy", "Your copy") { nav.openDeck(copied) } }
            round(starOn ? "starOn" : "star", "Save", on: starOn) { toggleStar(p, !starOn) }
            round("message", "Suggest a change") { openSuggest(card: "") }
          }
        }
        if canCheck {
          Button { check(p) } label: {
            HStack(spacing: 8) { Icon("shield", 16, 2); Text(busy == "check" ? "Checking…" : "Check this deck").css(16, .semibold).lineLimit(1) }
              .foregroundStyle(t.text).frame(maxWidth: .infinity).frame(height: 48).background(Capsule().fill(t.surf))
          }
          .buttonStyle(.press)
          .accessibilityLabel(busy == "check" ? "Checking…" : "Check this deck")
        }
        if mineChecked {
          HStack(spacing: 8) { Icon("shield", 16, 2).foregroundStyle(Color(hex: 0x3E63DD)); Text("Checked by you").css(16, .semibold).lineLimit(1) }
            .foregroundStyle(t.text).frame(maxWidth: .infinity).frame(height: 48).background(Capsule().fill(t.surf))
            .accessibilityElement(children: .ignore).accessibilityLabel("Checked by you").accessibilityAddTraits(.isStaticText)
        }
        if owns {
          HStack(spacing: 10) {
            Button { if let mine { nav.openDeck(mine.id) } else { nav.pick(.library) } } label: {
              HStack(spacing: 8) { Icon("pencil", 18, 2); Text("Edit").css(17, .semibold) }
                .foregroundStyle(t.invText).frame(maxWidth: .infinity).frame(height: 56).background(Capsule().fill(t.inv))
            }
            .buttonStyle(.press)
            round("message", "Suggestions", badge: me?.open ?? 0) { nav.push(.suggestions(mine?.id ?? "")) }
            round("gear", "Share settings") { if let mine { nav.openDeck(mine.id, settings: true) } else { nav.pick(.library) } }
          }
        }
        if !err.isEmpty { CSSText(err, 13, color: t.again).padding(.top, -6) }
        VStack(spacing: 0) {
          tabs(p, people: people.count)
          switch tab {
          case "History": historyTab(p)
          case "People": peopleTab(people)
          default: cardsTab(p, learner: learner, owns: owns, mine: mine, ownerName: ownerName)
          }
        }
      }
      .padding(.horizontal, 20)
    }
    .accessibilityElement(children: .contain)
    .accessibilityLabel(d.name + " by " + owner.name)
  }

  /// The cover: its gradient (or photo, under a soft shade), Back, Share, the bell, and Report; a badge, its name, and whose it is.
  private func cover(_ p: PublicDeckPage, watchOn: Bool, showWatch: Bool, canReport: Bool) -> some View {
    let d = p.deck, mesh = Mesh.deck(seed: d.cover.seed ?? (d.name.isEmpty ? "Lucida" : d.name), round: d.cover.round, style: d.cover.style ?? "mix")
    let photo = d.cover.image.flatMap { $0 == "mock" || $0.isEmpty ? nil : $0 }
    let ink = photo != nil ? Color.white : mesh.inkColor, shade = photo != nil ? 0.45 : mesh.shadow
    let owner = d.owner ?? NetPerson(), badge = badges(p).first
    let meta = "· " + NetFmt.k(d.cards) + (d.cards == 1 ? " card" : " cards") + " · v\(d.version)"
    return ZStack(alignment: .topLeading) {
      // The picture: it drifts at half speed as the page scrolls, and stretches when it's pulled down (Design/Parallax.swift).
      ZStack {
        MeshFill(mesh: mesh)
        if let photo {
          FillPhoto(url: API.media(photo))
          LinearGradient(colors: [.black.opacity(0.12), .black.opacity(0.55)], startPoint: .top, endPoint: .bottom)
        }
      }
      .coverParallax(still: still)
      VStack(alignment: .leading, spacing: 0) {
        HStack(spacing: 0) {
          CoverButton(icon: "back", label: "Back") { nav.back() }
          Spacer(minLength: 0)
          HStack(spacing: 8) {
            CoverButton(icon: "share", label: "Share") { ShareSheet.present(title: d.name, url: URL(string: store.shareLink(d.url))) }
            if showWatch {
              CoverButton(icon: "bell", label: watchOn ? "Getting updates" : "Get updates", filled: watchOn) { toggleWatch(p, !watchOn) }
                .accessibilityAddTraits(watchOn ? .isSelected : [])
            }
            // Report sits last, in the cover's own words and shade (anyone but the deck's owner).
            if canReport {
              Button { withAnimation(Motion.sheet) { nav.sheet = .report(kind: "deck", id: p.id, name: d.name) } } label: {
                Text("Report").css(15, .semibold).lineLimit(1).fixedSize().line(15).foregroundStyle(ink)
                  .shadow(color: .black.opacity(shade), radius: 7, x: 0, y: 1)
                  .padding(.leading, 8).padding(.trailing, 4).frame(height: 44)
              }
              .buttonStyle(.press)
              .accessibilityLabel("Report")
            }
          }
        }
        Spacer(minLength: 0)
        VStack(alignment: .leading, spacing: 8) {
          if let badge {
            HStack(spacing: 6) { Icon(badge.shield ? "shield" : "people", 13, 2); Text(badge.label).css(12, .semibold).lineLimit(1) }
              .foregroundStyle(.white).padding(.horizontal, 11).frame(height: 28).background(Capsule().fill(Color.black.opacity(0.28)))
          }
          CSSText(d.name, 32, .bold, lh: 1.05, color: ink, ls: -0.03, lines: 2)
            .shadow(color: .black.opacity(shade), radius: 7, x: 0, y: 1)
          HStack(spacing: 8) {
            // The name keeps its room first (the numbers after it shorten); a name too long for the cover shortens too.
            Button { if !owner.handle.isEmpty { nav.profile(owner.handle) } } label: {
              HStack(spacing: 8) { PersonAvatar(p: owner, size: 22); Text(owner.name).css(14, .semibold).lineLimit(1).line(14) }
            }
            .buttonStyle(.flat)
            .layoutPriority(1)
            Text(meta).css(14).lineLimit(1).line(14).opacity(0.85).shadow(color: .black.opacity(shade), radius: 7, x: 0, y: 1)
          }
        }
        .foregroundStyle(ink)
      }
      .padding(.top, Screen.top(54)).padding(.leading, 20).padding(.trailing, 16).padding(.bottom, 20)
    }
    .frame(height: Screen.top(300))
    .clipShape(BelowClip())
  }

  /// The cover's badges: a teacher's check, a school's deck, and who keeps it up (the phone shows the first).
  private func badges(_ p: PublicDeckPage) -> [(label: String, shield: Bool)] {
    let d = p.deck, checkedAt = p.made.first { $0.kind == "check" }, ownerName = d.owner?.name ?? ""
    let school = d.owner.map { $0.kind == "school" || $0.verified == "school" } ?? false
    var out: [(String, Bool)] = []
    if let c = d.checked { out.append(("Checked by " + c.name + (c.current ? "" : checkedAt.map { " at version \($0.version)" } ?? " earlier"), true)) }
    if school { out.append((ownerName, true)) }
    out.append((d.maintained == "community" ? "Kept up by the community" : "Kept up by " + PageText.firstName(ownerName), false))
    return out
  }

  /// A round button beside Study (56), gray; with a count in the corner when there is one.
  private func round(_ icon: String, _ label: String, on: Bool = false, badge: Int = 0, action: @escaping () -> Void) -> some View {
    Button(action: action) {
      Icon(icon, 20, 2).foregroundStyle(t.text).frame(width: 56, height: 56).background(Circle().fill(t.surf))
        .overlay(alignment: .topTrailing) {
          if badge > 0 {
            Text(String(badge)).css(11, .bold).foregroundStyle(.white).padding(.horizontal, 5).frame(minWidth: 18, minHeight: 18)
              .background(Capsule().fill(Color(hex: 0xE5484D))).padding(.top, 4).padding(.trailing, 2)
          }
        }
    }
    .buttonStyle(.press)
    .accessibilityLabel(label)
    .accessibilityValue(badge > 0 ? "\(badge) waiting" : "")
    .accessibilityAddTraits(on ? .isSelected : [])
  }

  // ---------- tabs ----------
  /// The owner, helpers, everyone whose changes are in it, and the teacher who checked it.
  private func peopleRows(_ p: PublicDeckPage) -> [(who: NetPerson, role: String)] {
    let d = p.deck, checkedAt = p.made.first { $0.kind == "check" }
    var seen = Set<String>(), rows: [(NetPerson, String)] = []
    func face(_ handle: String, _ name: String) -> NetPerson { p.people.first { $0.handle == handle } ?? NetPerson(handle: handle, name: name) }
    func add(_ x: NetPerson?, _ role: String) { guard let x, !x.handle.isEmpty, seen.insert(x.handle).inserted else { return }; rows.append((face(x.handle, x.name), role)) }
    add(d.owner, "Owner")
    for h in p.helpers { add(NetPerson(handle: h.handle, name: h.name), "Helper") }
    for h in p.contributors { add(NetPerson(handle: h.handle, name: h.name), PageText.plural(h.n, "change")) }
    if let c = d.checked { add(NetPerson(handle: c.handle, name: c.name), checkedAt.map { "Checked version \($0.version)" } ?? "Checked it") }
    return rows
  }

  private func tabs(_ p: PublicDeckPage, people: Int) -> some View {
    HStack(spacing: 28) {
      ForEach([("Cards", NetFmt.k(p.deck.cards)), ("History", ""), ("People", people > 0 ? String(people) : "")], id: \.0) { id, count in
        let on = tab == id
        Button { tab = id } label: {
          HStack(spacing: 8) {
            Text(id).css(14, .semibold)
            if !count.isEmpty { Text(count).css(12, .medium, mono: true).foregroundStyle(t.muted) }
          }
          .foregroundStyle(on ? t.text : t.muted)
          .frame(height: 44)
          .overlay(alignment: .bottom) { Rectangle().fill(on ? t.text : .clear).frame(height: 2) }
          .contentShape(Rectangle())
        }
        .buttonStyle(.flat)
        .accessibilityLabel(id).accessibilityValue(count)
        .accessibilityAddTraits(on ? .isSelected : [])
      }
      Spacer(minLength: 0)
    }
    .background(alignment: .bottom) { Rectangle().fill(t.line).frame(height: 1) }
  }

  /// Each card: its question, what kind it is and how it was made, and who made it; press one for its answer.
  private func cardsTab(_ p: PublicDeckPage, learner: Bool, owns: Bool, mine: Deck?, ownerName: String) -> some View {
    let list = p.cardsList, shown = Array(list.prefix(limit))
    var byName: [String: NetPerson] = [:]
    for x in p.people + [p.deck.owner].compactMap({ $0 }) { byName[x.name] = x }
    return VStack(alignment: .leading, spacing: 0) {
      ForEach(shown, id: \.id) { c in
        let w = PageText.touch(c, owner: ownerName)
        let who: Who = w.ai.isEmpty ? .person(byName[w.name] ?? NetPerson(name: w.name.nilIfEmpty ?? ownerName)) : .ai(w.ai)
        let line = (PageText.kinds[c.kind] ?? "Card") + (w.note.isEmpty ? "" : " · " + w.note), open = openCard == c.id, ask = PageText.askOf(c).nilIfEmpty ?? "Card"
        VStack(alignment: .leading, spacing: 0) {
          Button { openCard = open ? "" : c.id } label: {
            HStack(spacing: 16) {
              VStack(alignment: .leading, spacing: 3) {
                Text(ask).css(15, .medium).lineLimit(1).line(15)
                Text(line).css(13).foregroundStyle(t.muted).lineLimit(1).line(13)
              }
              .frame(maxWidth: .infinity, alignment: .leading)
              WhoAvatar(who: who, size: 24)
            }
            .foregroundStyle(t.text)
            .padding(.vertical, 10).frame(maxWidth: .infinity, minHeight: 60, alignment: .leading)
            .contentShape(Rectangle())
          }
          .buttonStyle(.flat)
          .accessibilityElement(children: .ignore)
          .accessibilityLabel(ask + ", " + line)
          .accessibilityValue(open ? "Open" : "")
          .accessibilityAddTraits(.isButton)
          if open {
            VStack(alignment: .leading, spacing: 10) {
              CSSText(PageText.answerOf(c).nilIfEmpty ?? "—", 14, lh: 1.45, color: t.muted)
              if learner {
                Button { openSuggest(card: c.id) } label: {
                  HStack(spacing: 6) { Icon("message", 14, 2); Text("Suggest a change").css(13, .semibold) }
                    .foregroundStyle(t.text).padding(.horizontal, 12).frame(height: 32).background(Capsule().fill(t.surf))
                }
                .buttonStyle(.press)
              }
              if owns {
                Button { if let mine { nav.newCard(deckId: mine.id, cardId: c.id) } else { nav.pick(.library) } } label: {
                  HStack(spacing: 6) { Icon("pencil", 14, 2); Text("Edit").css(13, .semibold) }
                    .foregroundStyle(t.text).padding(.horizontal, 12).frame(height: 32).background(Capsule().fill(t.surf))
                }
                .buttonStyle(.press)
              }
            }
            .padding(.trailing, 40).padding(.bottom, 14)
          }
        }
        .padding(.bottom, 1)
        .overlay(alignment: .bottom) { Rectangle().fill(t.line).frame(height: 1) }
      }
      if list.count > limit {
        GrayPill(label: "Show more") { limit += 100 }.padding(.top, 14)
      }
      if list.count <= limit && p.moreCards > 0 {
        Text("+ " + NetFmt.k(p.moreCards) + " more cards").css(13).foregroundStyle(t.muted).line(13).padding(.top, 16).padding(.bottom, 4)
      }
      if list.isEmpty { Text("No cards yet.").css(14).foregroundStyle(t.muted).line(14).padding(.vertical, 24) }
    }
  }

  /// The latest versions (all of them are on the History page).
  private func historyTab(_ p: PublicDeckPage) -> some View {
    VStack(alignment: .leading, spacing: 0) {
      ForEach(Array(p.made.prefix(5).enumerated()), id: \.offset) { _, v in
        let x = PageText.versionView(v, store.demo)
        HStack(spacing: 12) {
          VersionAvatar(v: x, size: 32)
          VStack(alignment: .leading, spacing: 2) {
            Text(x.title).css(14, .semibold).lineLimit(1).line(14)
            Text(x.label + " · " + x.when).css(12).foregroundStyle(t.muted).lineLimit(1).line(12)
          }
          .frame(maxWidth: .infinity, alignment: .leading)
        }
        .foregroundStyle(t.text)
        .padding(.vertical, 8).frame(minHeight: 80)
        .padding(.bottom, 1)
        .overlay(alignment: .bottom) { Rectangle().fill(t.line).frame(height: 1) }
        .accessibilityElement(children: .ignore)
        .accessibilityLabel(x.title + ", " + x.label + ", " + x.when)
      }
      GrayPill(label: "See all") { nav.history(p.deck.url) }.padding(.top, 14)
    }
  }

  private func peopleTab(_ rows: [(who: NetPerson, role: String)]) -> some View {
    VStack(alignment: .leading, spacing: 0) {
      ForEach(rows, id: \.who.handle) { r in
        Button { nav.profile(r.who.handle) } label: {
          HStack(spacing: 12) {
            PersonAvatar(p: r.who, size: 36)
            VStack(alignment: .leading, spacing: 2) {
              HStack(spacing: 6) { Text(r.who.name).css(15, .semibold).lineLimit(1); VerifiedMark(p: r.who) }.line(15)
              Text("@" + r.who.handle).css(12).foregroundStyle(t.muted).line(12)
            }
            .frame(maxWidth: .infinity, alignment: .leading)
            Text(r.role).css(13).foregroundStyle(t.muted).lineLimit(1).line(13)
          }
          .foregroundStyle(t.text)
          .frame(minHeight: 64)
          .padding(.bottom, 1)
          .overlay(alignment: .bottom) { Rectangle().fill(t.line).frame(height: 1) }
          .contentShape(Rectangle())
        }
        .buttonStyle(.flat)
        .accessibilityElement(children: .ignore)
        .accessibilityLabel(r.who.name + ", @" + r.who.handle + ", " + r.role)
        .accessibilityAddTraits(.isButton)
      }
    }
  }

  // ---------- what the buttons do ----------
  private func fail(_ e: Error) -> String { e.localizedDescription.nilIfEmpty ?? "Something went wrong. Try again." }

  /// Study: the deck joins your library as it is, and opens there.
  private func study(_ p: PublicDeckPage) {
    guard busy.isEmpty else { return }
    busy = "study"; err = ""
    Task {
      do {
        let id = try await store.studyDeck(p.id)
        busy = ""
        if !id.isEmpty && !store.demo { nav.openDeck(id) }
      } catch { busy = ""; err = fail(error) }
    }
  }
  /// Check this deck: the page then says "Checked by you"; if it didn't work, the page says so and the button stays.
  private func check(_ p: PublicDeckPage) {
    guard busy.isEmpty else { return }
    busy = "check"; err = ""
    Task {
      do { try await store.checkSharedDeck(p.id); busy = ""; checkedAt = p.deck.version }
      catch { busy = ""; err = fail(error) }
    }
  }
  private func toggleStar(_ p: PublicDeckPage, _ on: Bool) {
    guard p.me != nil else { return }
    star = on; err = ""; changes += 1
    Task { do { try await store.starDeck(p.id, on) } catch { star = nil; err = fail(error) } }
  }
  private func toggleWatch(_ p: PublicDeckPage, _ on: Bool) {
    guard p.me != nil else { return }
    watch = on; err = ""; changes += 1
    Task { do { try await store.watchDeck(p.id, on) } catch { watch = nil; err = fail(error) } }
  }
  /// Suggest a change from its button (no card yet) or from a card.
  private func openSuggest(card: String) {
    SuggestModel.of(addr.plain.key).open(card: card)
    withAnimation(Motion.sheet) { nav.sheet = .suggest(addr.plain, start: "") }
  }
}

/// Where the Folder button is, for its list.
private struct FolderAnchor: PreferenceKey {
  static let defaultValue: Anchor<CGRect>? = nil
  static func reduce(value: inout Anchor<CGRect>?, nextValue: () -> Anchor<CGRect>?) { value = value ?? nextValue() }
}

// ---------- Make a copy ----------
/// Copy to your library (COPY_FORM): the deck's name, a folder, and whether to get the owner's changes later.
struct CopyDeckSheet: View {
  @Environment(\.theme) private var t
  @EnvironmentObject private var store: Store
  @EnvironmentObject private var nav: Nav
  @StateObject private var keyboard = Keyboard()
  let addr: DeckAddress
  @State private var name: String? = nil
  @State private var folder = ""
  @State private var foldersOpen = false
  @State private var updates = true
  @State private var busy = false
  @State private var err = ""

  var body: some View {
    let p = store.netDeckPage(addr)?.value, d = p?.deck
    let title = name ?? d?.name ?? "", ready = !title.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty && !busy
    let owner = d?.owner?.name ?? ""
    let folders: [(id: String, name: String)] = [("", "Library")] + (store.demo ? store.demoFolders.map { ($0.id, $0.name) } : store.lib.folders.map { ($0.id, $0.name) })
    VStack(alignment: .leading, spacing: 16) {
      HStack(spacing: 14) {
        thumb(d)
        VStack(alignment: .leading, spacing: 3) {
          Text("Copy to your library").css(20, .semibold, ls: -0.02).lineLimit(1).line(20)
          Text(d.map { NetFmt.k($0.cards) + ($0.cards == 1 ? " card" : " cards") + " from " + owner } ?? "").css(14).foregroundStyle(t.muted).lineLimit(1).line(14)
        }
        Spacer(minLength: 0)
      }
      VStack(alignment: .leading, spacing: 8) {
        Text("Name").css(13, .semibold).line(13)
        TextField("", text: Binding(get: { title }, set: { name = $0.limited(120) }))
          .font(.geist(16)).foregroundStyle(t.text).autocorrectionDisabled().submitLabel(.done).onSubmit { save(d) }
          .padding(.horizontal, 16).frame(height: 50)
          .background(RoundedRectangle(cornerRadius: 16, style: .continuous).fill(t.bg))
          .overlay(RoundedRectangle(cornerRadius: 16, style: .continuous).strokeBorder(t.text, lineWidth: 2))
          .accessibilityLabel("Name")
      }
      VStack(alignment: .leading, spacing: 8) {
        Text("Folder").css(13, .semibold).line(13)
        let label = folders.first { $0.id == folder }?.name ?? "Library"
        Button { withAnimation(Motion.pop) { foldersOpen.toggle() } } label: {
          HStack(spacing: 10) { Text(label).css(16).lineLimit(1); Spacer(minLength: 0); Icon("chevDown", 16, 2) }
            .foregroundStyle(t.text).padding(.horizontal, 16).frame(height: 50)
            .background(RoundedRectangle(cornerRadius: 16, style: .continuous).fill(t.surf))
        }
        .buttonStyle(.flat)
        .accessibilityLabel("Folder: " + label)
        .anchorPreference(key: FolderAnchor.self, value: .bounds) { $0 }
      }
      HStack(spacing: 12) {
        VStack(alignment: .leading, spacing: 2) {
          Text("Get " + PageText.firstName(owner) + "’s updates").css(15, .semibold).line(15)
          Text("You choose which changes to take.").css(13).foregroundStyle(t.muted).line(13)
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        Toggle48(on: updates, label: "Get the owner’s updates") { updates.toggle() }
      }
      if !err.isEmpty { CSSText(err, 13, color: t.again) }
      // Each button is its own width of the space left over, plus its own padding (22 and 24 on the board), like the board's flex row.
      GeometryReader { g in
        let free = g.size.width - 10 - 92
        HStack(spacing: 10) {
          Button { nav.close() } label: {
            Text("Cancel").css(15, .semibold).foregroundStyle(t.text).frame(maxWidth: .infinity).frame(height: 48).background(Capsule().fill(t.surf))
          }
          .buttonStyle(.press)
          .frame(width: free / 2 + 44)
          Button { save(d) } label: {
            Text(busy ? "Copying…" : "Copy deck").css(15, .semibold).foregroundStyle(t.invText).frame(maxWidth: .infinity).frame(height: 48).background(Capsule().fill(t.inv))
              .compositingGroup().opacity(title.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty ? 0.4 : 1)
          }
          .buttonStyle(.press)
          .disabled(!ready)
          .frame(width: free / 2 + 48)
        }
      }
      .frame(height: 48)
    }
    .foregroundStyle(t.text)
    .padding(.top, 22).padding(.horizontal, 20).padding(.bottom, keyboard.height > 0 ? keyboard.height + 12 : 34)
    .overlayPreferenceValue(FolderAnchor.self) { a in folderPopup(a, folders) }
    .accessibilityAddTraits(.isModal)
    .accessibilityElement(children: .contain).accessibilityIdentifier("copy-sheet")
  }

  /// The folders, beside the button: below it, or above when there isn't room below (like the web's menus).
  @ViewBuilder private func folderPopup(_ a: Anchor<CGRect>?, _ folders: [(id: String, name: String)]) -> some View {
    if foldersOpen, let a {
      GeometryReader { g in
        let r = g[a], n = CGFloat(folders.count), h = min(232, 12 + n * 42 + (n - 1) * 2)
        let below = g.frame(in: .global).minY + r.maxY + 6 + h <= UIScreen.main.bounds.height - 8
        ZStack(alignment: .topLeading) {
          Color.black.opacity(0.001).frame(width: 4000, height: 4000).offset(x: -2000, y: -2000).onTapGesture { withAnimation(Motion.pop) { foldersOpen = false } }
          folderList(folders).frame(width: r.width).offset(x: r.minX, y: below ? r.maxY + 6 : r.minY - 6 - h)
        }
      }
    }
  }

  private func thumb(_ d: NetDeck?) -> some View {
    let mesh = d.map { Mesh.deck(seed: $0.cover.seed ?? $0.name, round: $0.cover.round, style: $0.cover.style ?? "mix") } ?? Mesh.palette("Iris")
    let photo = d?.cover.image.flatMap { $0 == "mock" || $0.isEmpty ? nil : $0 }
    return ZStack {
      MeshFill(mesh: mesh)
      if let photo { FillPhoto(url: API.media(photo)) }
    }
    .frame(width: 56, height: 56).clipShape(RoundedRectangle(cornerRadius: 14, style: .continuous))
  }

  private func folderList(_ folders: [(id: String, name: String)]) -> some View {
    ScrollView(showsIndicators: false) {
      VStack(spacing: 2) {
        ForEach(folders, id: \.id) { f in
          Button { folder = f.id; withAnimation(Motion.pop) { foldersOpen = false } } label: {
            HStack(spacing: 10) { Icon("folder", 16, 1.8); Text(f.name).css(15).lineLimit(1); Spacer(minLength: 0) }
              .foregroundStyle(t.text).padding(.horizontal, 12).frame(height: 42)
              .background(RoundedRectangle(cornerRadius: 12, style: .continuous).fill(f.id == folder ? t.surf : .clear))
              .contentShape(Rectangle())
          }
          .buttonStyle(.flat)
          .accessibilityLabel(f.name)
          .accessibilityAddTraits(f.id == folder ? .isSelected : [])
        }
      }
      .padding(6)
    }
    .frame(maxHeight: 232).fixedSize(horizontal: false, vertical: true)
    .background(RoundedRectangle(cornerRadius: 18, style: .continuous).fill(t.bg).shadow(color: .black.opacity(0.18), radius: 22, x: 0, y: 18))
    .overlay(RoundedRectangle(cornerRadius: 18, style: .continuous).strokeBorder(t.line, lineWidth: 1))
    .popTransition()
  }

  private func save(_ d: NetDeck?) {
    guard let d, !busy else { return }
    let n = (name ?? d.name).trimmingCharacters(in: .whitespacesAndNewlines)
    guard !n.isEmpty else { return }
    busy = true; err = ""; foldersOpen = false
    Task {
      do {
        let id = try await store.copyDeck(d.id, name: n, folder: folder.nilIfEmpty, updates: updates)
        busy = false
        nav.close()
        if !store.demo && !id.isEmpty { nav.openDeck(id) }
      } catch { busy = false; err = error.localizedDescription.nilIfEmpty ?? "Something went wrong. Try again." }
    }
  }
}
