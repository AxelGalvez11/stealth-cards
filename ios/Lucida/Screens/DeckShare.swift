// A deck's sharing (the study network): a deck of yours can be Private, Link only, or Public, with its page, its
// suggestions, and History; a deck from someone else says whose it is, and you study it as it is (you suggest changes
// instead of editing) or it's your copy (the owner's changes wait for you to take or skip). Deck settings → Sharing
// (PhoneDeckSettingsShare), the deck page's states (PhoneDeckStudied, PhoneDeckCopy), and the changes sheet
// (PhoneDeckUpdates).
import SwiftUI

/// How a deck is shared (db.js shareOf): yours (`shared`), or someone else's (`link`: studied as it is, or a copy).
struct DeckSharing {
  struct Shared { var vis = "", id = "", url = "", label = "" }
  struct Linked { var mode = "", gone = false, id = "", owner = LinkOwner(), url = "", pending = 0, updates = true }
  var shared: Shared? = nil
  var link: Linked? = nil
  /// A deck you study as it is: its cards follow the owner's, so you can't edit them, only suggest.
  var readOnly: Bool { link.map { $0.mode == "study" && !$0.gone } ?? false }
  var linked: Bool { link.map { !$0.gone } ?? false }
  var isCopy: Bool { link.map { $0.mode == "copy" && !$0.gone } ?? false }
  /// The Library's mark: "Public" or "Link only" for yours, "From <name>" for someone else's.
  var whose: String { link.map { "From " + ($0.owner.name.nilIfEmpty ?? "someone") } ?? shared?.label ?? "" }
  /// The owner's picture: their initial on pink (fromWho on the canvas).
  var ownerFace: NetPerson { NetPerson(handle: link?.owner.handle ?? "", name: link?.owner.name ?? "", color: 3) }
}

/// One of the owner's changes waiting for your copy, as the changes sheet shows it (db.js updatesOf).
struct UpdateRow: Identifiable {
  var id: String { card }
  var card = "", op = "edit", kind = "", mine = false
  var before: String? = nil, after: String? = nil
}

extension Store {
  func sharing(_ d: Deck) -> DeckSharing {
    var s = DeckSharing()
    if let sh = d.share, sh.vis != "private" {
      let h = myHandle
      s.shared = .init(vis: sh.vis, id: sh.id, url: h.isEmpty || sh.vis != "public" ? "/d/" + sh.id : "/@" + h + "/" + sh.slug, label: sh.vis == "public" ? "Public" : "Link only")
    }
    if let l = d.link {
      s.link = .init(mode: l.mode, gone: l.gone, id: l.id, owner: l.owner, url: "/d/" + l.id,
                     pending: l.gone ? 0 : l.pending.count, updates: l.updates)
    }
    return s
  }
  /// The canvas's sample deck (Cell Biology) as the deck page's Tweaks share it: yours (Public or Link only), or from
  /// Maria (as it is, or a copy with her changes waiting). mock.mjs deck().
  func demoSharing() -> DeckSharing {
    var s = DeckSharing()
    let lk = demoNet.detached ? "" : props.linked
    let vis = demoNet.vis ?? (props.shared == "Public" ? "public" : props.shared == "Link only" ? "link" : "private")
    if vis != "private" && lk.isEmpty { s.shared = .init(vis: vis, id: "s9", url: "/@alexkim/cell-biology", label: vis == "public" ? "Public" : "Link only") }
    if !lk.isEmpty {
      s.link = .init(mode: lk, gone: false, id: "s1", owner: LinkOwner(name: "Maria Santos", handle: "mariasantos"), url: "/@mariasantos/mcat-biochemistry",
                     pending: lk == "copy" && !demoNet.took ? 3 : 0, updates: demoNet.upd ?? true)
    }
    return s
  }
  /// A copy's waiting changes from the deck it came from.
  func deckUpdates(_ id: String) -> [UpdateRow] {
    let text = { (c: CardContent?) -> String? in c.map { $0.question + ($0.answer.isEmpty ? "" : " — " + $0.answer) } }
    if demo {
      guard props.linked == "copy", !demoNet.took else { return [] }
      return [UpdateRow(card: "u1", op: "edit", kind: "answer", mine: false, before: "Which enzyme is the rate-limiting step of glycolysis? — Hexokinase", after: "Which enzyme is the rate-limiting step of glycolysis? — Phosphofructokinase-1 (PFK-1)"),
              UpdateRow(card: "u2", op: "add", kind: "new", mine: false, before: nil, after: "What activates PFK-1? — AMP and fructose-2,6-bisphosphate"),
              UpdateRow(card: "u3", op: "edit", kind: "typo", mine: true, before: "Where is ATP made? — In the mitochondria (my notes)", after: "Where is ATP made? — Mostly in the mitochondria")]
    }
    guard let d = lib.decks.first(where: { $0.id == id }), let l = d.link, !l.gone else { return [] }
    return l.pending.map { p in UpdateRow(card: p.card, op: p.op, kind: p.kind, mine: p.mine, before: text(p.before), after: text(p.after)) }
  }
  /// A shared deck's link as people open it: on Lucida's own site, lucida.cards (the canvas's too); elsewhere, that
  /// server's address.
  func deckLink(_ path: String) -> String {
    let site = demo || API.base.host?.hasSuffix("lucida.cards") == true
    return (site ? "https://lucida.cards" : API.base.absoluteString.replacingOccurrences(of: "/$", with: "", options: .regularExpression)) + path
  }
}

let UPDATE_KIND = ["new": "New card", "answer": "Answer", "question": "Question", "typo": "Small fix", "media": "Picture or sound", "edit": "Note or tags", "remove": "Removed"]

/// Deck settings → Sharing (deckShareBody). A deck of yours: who can see it, its link, how many study, copy, and save it,
/// its hardest cards (Pro), its page, suggestions, and History, a line about it, and helpers who fix cards directly. A
/// deck from someone else: whose it is, and a copy's Get updates switch, or making a deck you study your own.
struct DeckShareTab: View {
  @Environment(\.theme) private var t
  @EnvironmentObject private var store: Store
  @EnvironmentObject private var nav: Nav
  @StateObject private var keyboard = Keyboard()
  let d: DeckVM
  @State private var about: String? = nil
  @State private var helperQ = ""
  @State private var shareErr = ""
  @State private var copied = false
  @State private var copiedTask: Task<Void, Never>? = nil
  @FocusState private var focus: String?

  var body: some View {
    let s = d.sharing, shr = s.shared, lk = s.link
    let row = store.demo ? store.demoMine().decks.first : shr.flatMap { sh in store.netMine()?.decks.first { $0.id == sh.id } }
    let vis = shr?.vis ?? "private"
    let helpers = row?.helpers ?? []
    let openN = row?.open ?? 0
    ScrollViewReader { proxy in
      ScrollView(showsIndicators: false) {
        VStack(alignment: .leading, spacing: 16) {
          if s.linked, let lk { from(s, lk) }
          if !s.readOnly {
            VStack(alignment: .leading, spacing: 8) {
              label("Who can see it")
              Segmented(options: [("private", "Private"), ("link", "Link only"), ("public", "Public")], current: vis, hPad: 10) { id in
                if id != vis { set(["visibility": id]) }
              }
              Text(["private": "Only you.", "link": "Anyone with the link.", "public": "On your profile and in Discover."][vis] ?? "").css(12).foregroundStyle(t.muted).line(12)
            }
            if let shr { sharedParts(shr, row: row, helpers: helpers, openN: openN, proxy: proxy) }
            else if !shareErr.isEmpty { CSSText(shareErr, 13, color: t.again) }
          }
        }
        .padding(.bottom, keyboard.height > 0 ? keyboard.height : 0)
      }
      .scrollDismissesKeyboard(.interactively)
      .onChange(of: focus) { was, f in
        // About this deck saves when you leave it (the web's blur).
        if was == "about" && f != "about", let a = about { set(["description": a]) }
        guard let f else { return }
        DispatchQueue.main.asyncAfter(deadline: .now() + 0.35) { withAnimation(.out(0.3)) { proxy.scrollTo(f, anchor: UnitPoint(x: 0.5, y: 0.3)) } }
      }
    }
    .onDisappear { copiedTask?.cancel(); if focus == "about", let a = about { set(["description": a]) } }
  }

  private func label(_ s: String) -> some View { Text(s).css(13, .semibold).line(13) }

  /// Whose it is (tap: its page), and for a deck you study, Suggest a change and Make it my own; a copy's Get updates.
  @ViewBuilder private func from(_ s: DeckSharing, _ lk: DeckSharing.Linked) -> some View {
    VStack(alignment: .leading, spacing: 12) {
      Button { nav.open(store.webURL(lk.url)) } label: {
        HStack(spacing: 12) {
          PersonAvatar(p: s.ownerFace, size: 36)
          VStack(alignment: .leading, spacing: 2) {
            Text((lk.mode == "copy" ? "Copied from " : "From ") + lk.owner.name).css(14, .semibold).foregroundStyle(t.text).lineLimit(1).line(14)
            Text(lk.gone ? "No longer shared. It’s yours now." : s.readOnly ? "You study it as it is." : "Your copy.").css(12).foregroundStyle(t.muted).lineLimit(1).line(12)
          }
          Spacer(minLength: 0)
        }
        .contentShape(Rectangle())
      }
      .buttonStyle(.flat)
      if s.readOnly {
        FlowLayout(spacing: 6, lineSpacing: 6) {
          SmallButton(label: "Suggest a change", icon: "message", bg: t.bg) { nav.open(store.webURL(lk.url + "?suggest=1")) }
          SmallButton(label: "Make it my own", icon: "copy", bg: t.bg) { Task { do { try await store.detach(d.id) } catch { shareErr = error.localizedDescription } } }
        }
      }
    }
    .padding(16)
    .frame(maxWidth: .infinity, alignment: .leading)
    .background(RoundedRectangle(cornerRadius: 18, style: .continuous).fill(t.surf))
    if s.isCopy {
      HStack(spacing: 12) {
        Text("Get " + (lk.owner.name.split(separator: " ").first.map(String.init) ?? "") + "’s updates").css(14, .semibold).frame(maxWidth: .infinity, alignment: .leading)
        Toggle48(on: lk.updates, label: "Get updates") { Task { do { try await store.copyUpdates(d.id, !lk.updates) } catch { shareErr = error.localizedDescription } } }
      }
      .frame(minHeight: 44)
    }
    if s.readOnly && !shareErr.isEmpty { CSSText(shareErr, 13, color: t.again) }
  }

  @ViewBuilder private func sharedParts(_ shr: DeckSharing.Shared, row: MinePage.Row?, helpers: [LinkOwner], openN: Int, proxy: ScrollViewProxy) -> some View {
    let link = store.deckLink(shr.url)
    HStack(spacing: 8) {
      Icon("link", 16, 1.8).foregroundStyle(t.muted)
      Text(link.replacingOccurrences(of: "^https?://", with: "", options: .regularExpression)).css(14).lineLimit(1).truncationMode(.tail).frame(maxWidth: .infinity, alignment: .leading)
      Button { copy(link) } label: {
        Text(copied ? "Copied" : "Copy link").css(13, .semibold).lineLimit(1).fixedSize().foregroundStyle(t.invText).padding(.horizontal, 14).frame(height: 34).background(Capsule().fill(t.inv))
      }
      .buttonStyle(.press)
    }
    .padding(.leading, 16).padding(.trailing, 6).frame(height: 46)
    .background(RoundedRectangle(cornerRadius: 16, style: .continuous).fill(t.surf))
    if let row {
      Text([NetFmt.k(row.learners) + " studying", NetFmt.k(row.copies) + (row.copies == 1 ? " copy" : " copies"), NetFmt.k(row.stars) + (row.stars == 1 ? " save" : " saves")].joined(separator: " · "))
        .css(13).foregroundStyle(t.muted).lineLimit(1).line(13)
    }
    // The hardest cards (Pro): the ones people miss most, counted without names.
    if store.isPro {
      let hard = Array((store.netStats(shr.id)?.hardest ?? []).prefix(3))
      if !hard.isEmpty {
        VStack(alignment: .leading, spacing: 6) {
          label("Hardest cards")
          ForEach(Array(hard.enumerated()), id: \.offset) { _, h in
            HStack(spacing: 12) {
              Text(h.text).css(13).lineLimit(1).frame(maxWidth: .infinity, alignment: .leading)
              Text("\(h.missed)% missed").css(12, .semibold).foregroundStyle(t.again).fixedSize()
            }
            .padding(.horizontal, 14).frame(minHeight: 40)
            .background(RoundedRectangle(cornerRadius: 14, style: .continuous).fill(t.surf))
          }
        }
      }
    } else {
      HStack(spacing: 12) {
        Text("Hardest cards").css(14, .semibold).frame(maxWidth: .infinity, alignment: .leading)
        Button { UIApplication.shared.open(API.pricing) } label: {
          Text("Go Pro").css(13, .semibold).foregroundStyle(t.invText).padding(.horizontal, 14).frame(height: 34).background(Capsule().fill(t.inv))
        }
        .buttonStyle(.press)
      }
      .frame(minHeight: 44)
    }
    FlowLayout(spacing: 6, lineSpacing: 6) {
      SmallButton(label: "Its page", icon: "globe") { nav.open(store.webURL(shr.url)) }
      SmallButton(label: openN > 0 ? plural(openN, "suggestion") : "Suggestions", icon: "message") { nav.open(store.webURL("/deck/" + d.id + "/suggestions")) }
      SmallButton(label: "History", icon: "history") { nav.open(store.webURL(shr.url + "/history")) }
    }
    VStack(alignment: .leading, spacing: 8) {
      label("About this deck")
      TextField("", text: Binding(get: { about ?? row?.description ?? "" }, set: { about = $0.limited(300) }), prompt: Text("What it covers, who it’s for").foregroundStyle(PLACEHOLDER), axis: .vertical)
        .lineLimit(2, reservesSpace: true)
        .font(.geist(16)).foregroundStyle(t.text).lineSpacing(16 * 1.4 - 16 * GEIST_LINE)
        .focused($focus, equals: "about")
        // A textarea's lines are 1.4 times the size, with half the extra above the first and below the last.
        .padding(.horizontal, 16).padding(.vertical, 12 + (16 * 1.4 - 16 * GEIST_LINE) / 2)
        .background(RoundedRectangle(cornerRadius: 16, style: .continuous).fill(t.surf))
        .accessibilityLabel("About this deck")
    }
    .id("about")
    VStack(alignment: .leading, spacing: 8) {
      label("Helpers")
      Text("They fix cards directly.").css(12).foregroundStyle(t.muted).line(12).padding(.top, -4)
      if !helpers.isEmpty {
        FlowLayout(spacing: 6, lineSpacing: 6) {
          ForEach(helpers, id: \.handle) { h in
            Button { set(["helpers": helpers.filter { $0.handle != h.handle }.map(\.handle)]) } label: {
              HStack(spacing: 6) { Text("@" + h.handle).css(13, .semibold); Icon("close", 10, 2.4).opacity(0.6) }
                .foregroundStyle(t.text).padding(.leading, 12).padding(.trailing, 10).frame(height: 32).background(Capsule().fill(t.surf))
            }
            .buttonStyle(.press)
            .accessibilityLabel("Remove helper @" + h.handle)
          }
        }
      }
      HStack(spacing: 6) {
        TextField("", text: $helperQ, prompt: Text("@name").foregroundStyle(PLACEHOLDER))
          .font(.geist(16)).foregroundStyle(t.text).textInputAutocapitalization(.never).autocorrectionDisabled()
          .focused($focus, equals: "helper")
          .submitLabel(.done).onSubmit { addHelper(helpers) }
          .onChange(of: helperQ) { _, _ in shareErr = "" }
          .padding(.horizontal, 14).frame(height: 40)
          .background(Capsule().fill(t.surf))
          .accessibilityLabel("Add a helper")
        SmallButton(label: "Add", icon: "plus") { addHelper(helpers) }
      }
      if !shareErr.isEmpty { CSSText(shareErr, 13, color: t.again) }
    }
    .id("helper")
    if !helpers.isEmpty {
      HStack(spacing: 12) {
        Text("Helpers take suggestions too").css(14, .semibold).frame(maxWidth: .infinity, alignment: .leading)
        let on = row?.maintained == "community"
        Toggle48(on: on, label: "Helpers take suggestions too") { set(["maintained": on ? "creator" : "community"]) }
      }
      .frame(minHeight: 44)
    }
  }

  // ---------- what the controls do ----------
  private func set(_ o: [String: Any]) {
    Task {
      do { try await store.shareDeck(d.id, o); shareErr = "" }
      catch { shareErr = error.localizedDescription }
    }
  }
  private func addHelper(_ helpers: [LinkOwner]) {
    var h = helperQ.trimmingCharacters(in: .whitespacesAndNewlines).lowercased()
    while h.hasPrefix("@") { h.removeFirst() }
    guard !h.isEmpty else { return }
    Task {
      do { try await store.shareDeck(d.id, ["helpers": helpers.map(\.handle) + [h]]); shareErr = ""; helperQ = "" }
      catch { shareErr = error.localizedDescription }
    }
  }
  private func copy(_ link: String) {
    UIPasteboard.general.string = link
    copied = true
    copiedTask?.cancel()
    copiedTask = Task { try? await Task.sleep(nanoseconds: 1_600_000_000); if !Task.isCancelled { copied = false } }
  }
}

/// A copy of someone's deck, with their newer changes waiting (deckUpdatesBody): take or skip each one (a card you
/// changed too: keep yours, or take theirs), or all of them at once.
struct DeckUpdatesSheet: View {
  @Environment(\.theme) private var t
  @EnvironmentObject private var store: Store
  @EnvironmentObject private var nav: Nav
  let deckId: String
  @State private var err = ""
  var body: some View {
    let owner = store.demo ? "Maria Santos" : store.lib.decks.first { $0.id == deckId }?.link?.owner.name ?? ""
    let rows = store.deckUpdates(deckId)
    let n = rows.count > 0 ? rows.count : (store.demo ? 0 : store.lib.decks.first { $0.id == deckId }?.link?.pending.count ?? 0)
    VStack(alignment: .leading, spacing: 14) {
      HStack(spacing: 12) {
        Text("Changes from " + owner).css(18, .semibold, ls: -0.01).lineLimit(1).line(18).frame(maxWidth: .infinity, alignment: .leading)
        Button(action: nav.close) { Icon("close", 14, 2.2).foregroundStyle(t.text).frame(width: 36, height: 36).background(Circle().fill(t.surf)) }
          .buttonStyle(.press).accessibilityLabel("Close")
      }
      HStack(spacing: 8) {
        Pill(label: "Skip all") { pick(["$all": "skip"], close: true) }
        Pill(label: "Take all \(n)", icon: "check", inv: true) { pick(["$all": "take"], close: true) }
      }
      if !err.isEmpty { CSSText(err, 13, color: t.again) }
      ScrollView(showsIndicators: false) {
        VStack(spacing: 12) {
          ForEach(rows) { u in change(u) }
        }
      }
      .clipped()
    }
    .foregroundStyle(t.text)
    .padding(.top, 20).padding(.horizontal, 20).padding(.bottom, 34)
  }

  private func change(_ u: UpdateRow) -> some View {
    VStack(alignment: .leading, spacing: 10) {
      HStack(spacing: 8) {
        Text(UPDATE_KIND[u.kind] ?? "Change").css(12, .semibold).padding(.horizontal, 9).frame(height: 24).background(Capsule().fill(t.surf))
        if u.mine { Text("You changed it too").css(12, .semibold).foregroundStyle(t.hard).line(12) }
      }
      if let b = u.before, u.op != "add" {
        CSSText(b, 14, lh: 1.4, color: t.again, strike: true).frame(maxWidth: .infinity, alignment: .leading)
          .padding(.horizontal, 14).padding(.vertical, 10)
          .background(RoundedRectangle(cornerRadius: 12, style: .continuous).fill(t.againTint))
      }
      if let a = u.after {
        CSSText(a, 14, lh: 1.4, color: t.good).frame(maxWidth: .infinity, alignment: .leading)
          .padding(.horizontal, 14).padding(.vertical, 10)
          .background(RoundedRectangle(cornerRadius: 12, style: .continuous).fill(t.goodTint))
      }
      HStack(spacing: 8) {
        Spacer(minLength: 0)
        SmallButton(label: u.mine ? "Keep mine" : "Skip") { pick([u.card: "skip"]) }
        InvSmallButton(label: u.mine ? "Take theirs" : "Take it", icon: u.mine ? nil : "check") { pick([u.card: "take"]) }
      }
    }
    .padding(16)
    .overlay(RoundedRectangle(cornerRadius: 18, style: .continuous).strokeBorder(t.line, lineWidth: 1))
  }

  private func pick(_ picks: [String: String], close: Bool = false) {
    err = ""
    Task {
      do {
        try await store.takeUpdates(deckId, picks)
        // Nothing left to take or skip: the sheet goes.
        if close || store.deckUpdates(deckId).isEmpty { nav.close() }
      } catch { err = error.localizedDescription }
    }
  }
}

/// smallBtn on black: a 34-tall black pill with white words.
struct InvSmallButton: View {
  @Environment(\.theme) private var t
  let label: String
  var icon: String? = nil
  let action: () -> Void
  var body: some View {
    Button(action: action) {
      HStack(spacing: 6) { if let icon { Icon(icon, 14, 2) }; Text(label).css(13, .semibold) }
        .foregroundStyle(t.invText).padding(.horizontal, 12).frame(height: 34).background(Capsule().fill(t.inv))
    }
    .buttonStyle(.press)
  }
}
