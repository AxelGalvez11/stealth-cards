// iPhone · Discover (PhoneDiscover, PhoneDiscoverSearch): the News bell in its header (it was on Today's), then decks people share, by topic, in sections (popular at your school, if you set
// one, popular this week, from people you follow, checked by teachers, new); or search decks and people. Level, Subject, and School
// narrow either to one list of decks (a school is searched as you type; nothing lists the people at a school, so a search with a
// filter finds no people). Studying stays in your library; Discover is only for finding more. A deck opens its page; a name opens
// that person's profile.
import SwiftUI

struct DiscoverScreen: View {
  @Environment(\.theme) private var t
  @EnvironmentObject private var store: Store
  @EnvironmentObject private var nav: Nav
  @State private var q = ""
  @State private var tag = ""
  /// Narrowed by a level and a subject (ids from Generated.levels and subjects) and a school.
  @State private var level = ""
  @State private var subject = ""
  @State private var school: Chosen? = nil
  struct Chosen: Equatable { var id: String; var name: String }

  var body: some View {
    let words = q.trimmingCharacters(in: .whitespacesAndNewlines), searching = !words.isEmpty
    let narrowed = !level.isEmpty || !subject.isEmpty || school != nil
    let disc = searching ? nil : store.netDiscover(tag, level: level, subject: subject, school: school?.id ?? "")
    let found = searching ? store.netSearch(words, level: level, subject: subject, school: school?.id ?? "") : nil
    let loading = searching ? found == nil : disc == nil
    let bad = searching ? (found?.isMissing == true || found?.isOffline == true) : (disc?.isMissing == true || disc?.isOffline == true)
    let sections = (disc?.value?.sections ?? []).map { (id: $0.id, title: $0.title, decks: $0.decks.prefix(6).map { TileVM($0) }) }
    let hits = found?.value ?? SearchPage()
    ScrollView(showsIndicators: false) {
      VStack(alignment: .leading, spacing: 16) {
        HStack(spacing: 12) {
          Text("Discover").css(32, .semibold, ls: -0.03).line(32).foregroundStyle(t.text).accessibilityAddTraits(.isHeader).frame(maxWidth: .infinity, alignment: .leading)
          NewsBell(count: store.netUnread()) { nav.push(.news) }
        }
        search
        filters(narrowed)
        if !searching { topics(["" ] + (disc?.value?.topics ?? [])) }
        if loading && !bad { NetLoading(rows: 2) }
        if !searching && !loading && !bad {
          ForEach(sections, id: \.id) { x in
            VStack(alignment: .leading, spacing: 12) {
              Text(x.title).css(17, .semibold).lineLimit(1).line(17).foregroundStyle(t.text)
              grid(x.decks, owners: true)
            }
          }
          if sections.isEmpty { NetNote(text: narrowed ? "No decks match." : "No one has shared a deck here yet.") }
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
    .onAppear { if store.demo { showBoard() } }
  }

  /// The design screen's Tweaks: its search, its filters (words or ids), and a picker open with what's typed in it.
  private func showBoard() {
    let p = store.props
    if q.isEmpty { q = p.q }
    level = Generated.levels.first { $0.words == p.level || $0.id == p.level }?.id ?? level
    subject = Generated.subjects.first { $0.words == p.subject || $0.id == p.subject }?.id ?? subject
    if !p.school.isEmpty, school == nil, let s = SchoolList.shared.rows.first(where: { $0.name == p.school || $0.id == p.school }) { school = Chosen(id: s.id, name: s.name) }
    guard !p.pick.isEmpty, nav.picker == nil else { return }
    store.props.pick = ""
    DispatchQueue.main.asyncAfter(deadline: .now() + 0.4) {
      switch p.pick {
      case "Level": askLevel()
      case "Subject": askSubject()
      default: askSchool(start: p.pickQ)
      }
    }
  }

  // ---------- the filters ----------
  private func askLevel() {
    nav.picker = PickRequest(title: "Level", rows: PickRow.levels, value: level, any: "Any level") { level = $0?.id ?? "" }
  }
  private func askSubject() {
    nav.picker = PickRequest(title: "Subject", rows: PickRow.subjects, value: subject, any: "Any subject", full: true) { subject = $0?.id ?? "" }
  }
  private func askSchool(start: String = "") {
    nav.picker = PickRequest(title: "School", find: store.demo ? PickRow.sampleSchools : PickRow.schools, value: school?.id ?? "", any: "Any school", noneLine: "No school matches", full: true, query: start) { row in
      school = row.map { Chosen(id: $0.id, name: $0.words) }
    }
  }

  /// A pill each for Level, Subject, and School (black once it holds a choice), and Clear while any does.
  private func filters(_ narrowed: Bool) -> some View {
    // The pills scroll sideways; Clear stays at the right edge, where it can always be reached.
    HStack(spacing: 0) {
      ScrollView(.horizontal, showsIndicators: false) {
        HStack(spacing: 8) {
          pill("Level", on: !level.isEmpty, text: SchoolWords.level(level), action: askLevel)
          pill("Subject", on: !subject.isEmpty, text: SchoolWords.subject(subject), action: askSubject)
          pill("School", on: school != nil, text: school?.name ?? "") { askSchool() }
        }
        .padding(.leading, 20).padding(.trailing, 8)
      }
      .padding(.leading, -20)
      if narrowed {
        Button { level = ""; subject = ""; school = nil } label: { Text("Clear").css(13, .semibold).lineLimit(1).fixedSize().foregroundStyle(t.muted).padding(.horizontal, 6).frame(height: 36) }
          .buttonStyle(.press)
      }
    }
    .padding(.top, -4)
    .accessibilityElement(children: .contain)
    .accessibilityLabel("Filters")
  }

  private func pill(_ name: String, on: Bool, text: String, action: @escaping () -> Void) -> some View {
    Button(action: action) {
      HStack(spacing: 6) {
        Text(on ? text : name).css(13, .semibold).lineLimit(1).truncationMode(.tail)
        Icon("chevDown", 14, 2.2)
      }
      .foregroundStyle(on ? t.invText : t.text).padding(.leading, 14).padding(.trailing, 10).frame(height: 36).frame(maxWidth: 240)
      .fixedSize(horizontal: true, vertical: false)
      .background(Capsule().fill(on ? t.inv : .clear))
      .overlay(Capsule().strokeBorder(on ? .clear : t.surf2, lineWidth: 1))
    }
    .buttonStyle(.press)
    .accessibilityLabel(on ? text : name)
    .accessibilityAddTraits(on ? .isSelected : [])
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
    .haptic(.selection, on: tag, "topic")
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

/// NEWS_BTN: the bell, with how much news is new in a red dot on its corner (99+ past 99).
struct NewsBell: View {
  @Environment(\.theme) private var t
  let count: Int
  let action: () -> Void
  var body: some View {
    Button(action: action) {
      Icon("bell", 18, 2).foregroundStyle(t.text).frame(width: 44, height: 44).background(Circle().fill(t.surf))
        .overlay(alignment: .topTrailing) {
          if count > 0 {
            Text(count > 99 ? "99+" : String(count)).css(11, .bold).foregroundStyle(.white).lineLimit(1).fixedSize()
              .padding(.horizontal, 5).frame(minWidth: 18, minHeight: 18, maxHeight: 18)
              .background(Capsule().fill(Color(hex: 0xE5484D)))
              .background(Capsule().fill(t.bg).padding(-2))
              .offset(x: 3, y: -3)
          }
        }
    }
    .buttonStyle(.press)
    .accessibilityLabel(count > 0 ? "Notifications, \(count) new" : "Notifications")
  }
}
