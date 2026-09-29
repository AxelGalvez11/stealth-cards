// iPhone · News (PhoneActivity, PhoneActivityEmpty, and the Dark and Gray twins), from the bell on Today: suggestions on
// your decks, people following you, new versions of decks you follow, what owners did with your suggestions, and
// teachers checking your decks. What's new has a dot; opening the page marks it read a moment later (the bell's count
// goes), and what was new when you opened it keeps its dot while you're here.
import SwiftUI

struct NewsScreen: View {
  @Environment(\.theme) private var t
  @EnvironmentObject private var store: Store
  @EnvironmentObject private var nav: Nav
  /// What was new when the page opened.
  @State private var fresh: Set<String>? = nil
  @State private var reading = false

  var body: some View {
    let data = store.netActivity(), bad = data?.isMissing == true || data?.isOffline == true
    let list = data?.value?.items ?? []
    ScrollView(showsIndicators: false) {
      VStack(alignment: .leading, spacing: 16) {
        HStack(spacing: 12) {
          RoundButton(icon: "back", label: "Back") { nav.back() }
          Text("News").css(17, .semibold).frame(maxWidth: .infinity).accessibilityAddTraits(.isHeader)
          Color.clear.frame(width: 44, height: 44)
        }
        .foregroundStyle(t.text)
        if data == nil { NetLoading(rows: 3) }
        if !list.isEmpty {
          VStack(spacing: 0) { ForEach(list) { row($0) } }
        }
        if data != nil && !bad && list.isEmpty { NetNote(text: "Nothing new") }
        if bad { NetNote(text: "Couldn’t reach Lucida. Check your connection.") }
      }
      .padding(.horizontal, 20).padding(.top, Screen.top(64)).padding(.bottom, 34)
    }
    .ignoresSafeArea(edges: .top)
    .toolbar(.hidden, for: .navigationBar)
    .onChange(of: data?.value != nil, initial: true) { _, has in
      guard has, let page = data?.value else { return }
      if fresh == nil { fresh = Set(page.items.filter { !$0.read }.map(\.id)) }
      // Marked read a moment after the page opens.
      if page.unread > 0 && !reading && !store.demo {
        reading = true
        Task { try? await Task.sleep(nanoseconds: 1_500_000_000); await store.readNews() }
      }
    }
  }

  private func row(_ x: NewsItem) -> some View {
    let d = x.data, dk = x.deck, n = d?.n ?? 0, took = d?.took ?? 0, skipped = d?.skipped ?? 0
    let who = x.person ?? NetPerson(name: x.actorName), actor = x.actorName.nilIfEmpty ?? who.name.nilIfEmpty ?? "Someone"
    let did = took > 0 && skipped > 0 ? "took \(took) of your changes to" : took > 0 ? (took == 1 ? "took your change to" : "took your \(took) changes to")
      : skipped == 1 ? "skipped your change to" : "skipped your changes to"
    let words: (String, String, String) = {
      switch x.kind {
      case "suggestion": return (actor, "suggested " + (n == 1 ? "a change" : "\(n) changes") + " to", dk?.name ?? "")
      case "follow": return (actor, "followed you", "")
      case "update": return (dk?.name.nilIfEmpty ?? "A deck you follow", "has " + (d?.summary.nilIfEmpty ?? "changes"), "")
      case "decided": return (actor, did, dk?.name ?? "")
      case "checked": return (actor, "checked", dk?.name ?? "")
      default: return (actor, "", dk?.name ?? "")
      }
    }()
    let isNew = !x.read || (fresh?.contains(x.id) ?? false)
    let note = x.kind == "suggestion" ? d?.message ?? "" : ""
    return Button { open(x, who: who) } label: {
      HStack(spacing: 12) {
        PersonAvatar(p: who, size: 40)
        VStack(alignment: .leading, spacing: 3) {
          CSSText(parts: [(words.0, .semibold), (" " + words.1 + " ", .regular), (words.2, .semibold)], 15, lh: 1.4, color: t.text)
          if !note.isEmpty { Text(note).css(13).foregroundStyle(t.muted).lineLimit(1).line(13) }
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        Text(NetFmt.ago(x.created, demo: store.demo)).css(12).foregroundStyle(t.muted).fixedSize()
        Circle().fill(isNew ? Color(hex: 0x3E63DD) : .clear).frame(width: 8, height: 8)
      }
      .foregroundStyle(t.text)
      .padding(.vertical, 12).frame(minHeight: 67)
      .padding(.bottom, 1)
      .overlay(alignment: .bottom) { Rectangle().fill(t.line).frame(height: 1) }
      .contentShape(Rectangle())
    }
    .buttonStyle(.flat)
    .accessibilityElement(children: .ignore)
    .accessibilityLabel([words.0, words.1, words.2].filter { !$0.isEmpty }.joined(separator: " ") + (note.isEmpty ? "" : ", " + note) + ", " + NetFmt.ago(x.created, demo: store.demo))
    .accessibilityValue(isNew ? "New" : "")
    .accessibilityAddTraits(.isButton)
  }

  /// A follow opens their profile; a suggestion on your deck, its suggestions; the rest, the deck's page (the web app's
  /// pages for now).
  private func open(_ x: NewsItem, who: NetPerson) {
    if x.kind == "follow" { nav.profile(who.handle.nilIfEmpty ?? x.data?.handle ?? ""); return }
    let dk = x.deck
    if x.kind == "suggestion", let id = dk?.id, !id.isEmpty, let mine = store.lib.decks.first(where: { $0.share?.id == id }) {
      nav.open(store.webURL("/deck/" + mine.id + "/suggestions")); return
    }
    if let u = dk?.url, !u.isEmpty { nav.open(store.webURL(u)) }
  }
}
