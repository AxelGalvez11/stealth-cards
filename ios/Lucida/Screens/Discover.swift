// iPhone · Discover (PhoneDiscover, PhoneDiscoverSearch): decks people share, by topic, in sections (popular this week,
// from people you follow, checked by teachers, new); or search decks and people. Studying stays in your library;
// Discover is only for finding more. A deck opens its page; a name opens that person's profile.
import SwiftUI

struct DiscoverScreen: View {
  @Environment(\.theme) private var t
  @EnvironmentObject private var store: Store
  @EnvironmentObject private var nav: Nav
  @State private var q = ""
  @State private var tag = ""

  var body: some View {
    let words = q.trimmingCharacters(in: .whitespacesAndNewlines), searching = !words.isEmpty
    let disc = searching ? nil : store.netDiscover(tag), found = searching ? store.netSearch(words) : nil
    let loading = searching ? found == nil : disc == nil
    let bad = searching ? (found?.isMissing == true || found?.isOffline == true) : (disc?.isMissing == true || disc?.isOffline == true)
    let sections = (disc?.value?.sections ?? []).map { (id: $0.id, title: $0.title, decks: $0.decks.prefix(6).map { TileVM($0) }) }
    let hits = found?.value ?? SearchPage()
    ScrollView(showsIndicators: false) {
      VStack(alignment: .leading, spacing: 16) {
        Text("Discover").css(32, .semibold, ls: -0.03).line(32).foregroundStyle(t.text).accessibilityAddTraits(.isHeader)
        search
        if !searching { topics(["" ] + (disc?.value?.topics ?? [])) }
        if loading && !bad { NetLoading(rows: 2) }
        if !searching && !loading && !bad {
          ForEach(sections, id: \.id) { x in
            VStack(alignment: .leading, spacing: 12) {
              Text(x.title).css(17, .semibold).lineLimit(1).line(17).foregroundStyle(t.text)
              grid(x.decks, owners: true)
            }
          }
          if sections.isEmpty { NetNote(text: "No one has shared a deck here yet.") }
        }
        if searching && !loading {
          if !hits.people.isEmpty { people(hits.people) }
          if !hits.decks.isEmpty {
            VStack(alignment: .leading, spacing: 12) {
              Text("Decks").css(17, .semibold).line(17).foregroundStyle(t.text)
              grid(hits.decks.map { TileVM($0) }, owners: false)
            }
          }
          if hits.decks.isEmpty && hits.people.isEmpty { NetNote(text: "Nothing matches “" + words + "” yet.") }
        }
        if bad { NetNote(text: "Couldn’t reach Lucida.") }
      }
      .padding(.horizontal, 20).padding(.top, Screen.top(64)).padding(.bottom, 120)
    }
    .scrollDismissesKeyboard(.immediately)
    .ignoresSafeArea(edges: .top)
    .onAppear { if store.demo && q.isEmpty { q = store.props.q } }
  }

  private var search: some View {
    HStack(spacing: 10) {
      Icon("search", 16, 1.8).foregroundStyle(t.muted)
      TextField("", text: $q, prompt: Text("Search decks and people").foregroundStyle(PLACEHOLDER))
        .font(.geist(16)).foregroundStyle(t.text).textInputAutocapitalization(.never).autocorrectionDisabled().submitLabel(.search)
        .accessibilityLabel("Search decks and people")
      if !q.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty {
        Button { q = "" } label: {
          Icon("close", 10, 2.4).foregroundStyle(t.text).frame(width: 26, height: 26).background(Circle().fill(t.surf2))
        }
        .buttonStyle(.press)
        .accessibilityLabel("Clear search")
      }
    }
    .padding(.horizontal, 16).frame(height: 44)
    .background(Capsule().fill(t.surf))
  }

  /// For you, then the topics people share decks in; one picked narrows every section to it (tap it again for all).
  private func topics(_ list: [String]) -> some View {
    ScrollView(.horizontal, showsIndicators: false) {
      HStack(spacing: 8) {
        ForEach(list, id: \.self) { g in
          let on = g == tag
          Button { tag = g.isEmpty || g == tag ? "" : g } label: {
            Text(g.isEmpty ? "For you" : g).css(13, .semibold).lineLimit(1).fixedSize()
              .foregroundStyle(on ? t.invText : t.text).padding(.horizontal, 14).frame(height: 36)
              .background(Capsule().fill(on ? t.inv : t.surf))
          }
          .buttonStyle(.press)
          .accessibilityAddTraits(on ? .isSelected : [])
        }
      }
      .padding(.horizontal, 20)
    }
    .padding(.horizontal, -20)
    .accessibilityElement(children: .contain)
    .accessibilityLabel("Topics")
  }

  /// Two tiles across; under each, whose it is (in the sections).
  private func grid(_ decks: [TileVM], owners: Bool) -> some View {
    LazyVGrid(columns: [GridItem(.flexible(), spacing: 12, alignment: .top), GridItem(.flexible(), alignment: .top)], alignment: .leading, spacing: 12) {
      ForEach(decks) { d in
        VStack(alignment: .leading, spacing: 8) {
          Button { nav.deckPage(d.url) } label: { NetTile(d: d, height: 200) }
            .buttonStyle(.press)
          if owners, let o = d.owner { OwnerLine(p: o) { nav.profile(o.handle) } }
        }
      }
    }
  }

  private func people(_ list: [NetPerson]) -> some View {
    VStack(alignment: .leading, spacing: 0) {
      Text("People").css(17, .semibold).line(17).foregroundStyle(t.text).padding(.bottom, 6)
      ForEach(list, id: \.handle) { p in
        Button { nav.profile(p.handle) } label: {
          HStack(spacing: 12) {
            PersonAvatar(p: p, size: 40)
            VStack(alignment: .leading, spacing: 2) {
              HStack(spacing: 6) { Text(p.name).css(16, .semibold).lineLimit(1); VerifiedMark(p: p) }.line(16)
              Text("@" + p.handle).css(13).foregroundStyle(t.muted).lineLimit(1).line(13)
            }
            Spacer(minLength: 0)
          }
          .foregroundStyle(t.text)
          // 64 tall, then its 1-point line under it.
          .frame(height: 64).padding(.bottom, 1)
          .overlay(alignment: .bottom) { Rectangle().fill(t.line).frame(height: 1) }
          .contentShape(Rectangle())
        }
        .buttonStyle(.flat)
        .accessibilityLabel(p.name + ", @" + p.handle)
      }
    }
  }
}
