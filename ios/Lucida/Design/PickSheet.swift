// A list to pick from, in a sheet over the page (the boards' pickSheet): Discover's Level, Subject, and School filters, Edit profile's
// School, and a deck's labels in its Sharing settings. A short list (the five levels) is a short sheet; a long one (the thirty
// subjects) or a search (the school list: nothing shows until something is typed) is a tall one. Picking a row closes it.
import SwiftUI

struct PickRow: Identifiable, Hashable {
  let id: String
  /// Its words, and a line under them (a school's city and state).
  let words: String
  var sub = ""
}

/// What a screen asks to pick from. `choose` gets the row (nil for the "any" row: nothing picked).
struct PickRequest: Identifiable {
  let id = UUID()
  var title: String
  /// The rows to choose from; or, for a search (`find`), none until something is typed.
  var rows: [PickRow] = []
  var find: ((String) -> [PickRow])? = nil
  /// The one picked now ("": none), and the words for picking none again ("": no such row).
  var value = ""
  var any = ""
  var placeholder = "Search schools", noneLine = "Nothing matches"
  var full = false
  /// What's typed to start with (a design screen).
  var query = ""
  /// A search may offer what was typed as it is ("Other: “…”"): the words of that row, and what picking it does.
  var other: ((String) -> String)? = nil
  var chooseOther: (String) -> Void = { _ in }
  let choose: (PickRow?) -> Void
}

struct PickHost: View {
  @EnvironmentObject private var nav: Nav
  let request: PickRequest
  var body: some View {
    SheetOverlay(top: request.full ? 56 : nil, radius: 32, close: shut) { PickSheet(r: request, close: shut) }
  }
  private func shut() { withAnimation(.out(0.3)) { nav.picker = nil } }
}

struct PickSheet: View {
  @Environment(\.theme) private var t
  @EnvironmentObject private var store: Store
  @StateObject private var keyboard = Keyboard()
  let r: PickRequest
  let close: () -> Void
  @State private var q: String
  @FocusState private var focus: Bool

  init(r: PickRequest, close: @escaping () -> Void) { self.r = r; self.close = close; _q = State(initialValue: r.query) }

  var body: some View {
    let typed = q.trimmingCharacters(in: .whitespacesAndNewlines)
    let found = r.find.map { typed.isEmpty ? [] : $0(typed) } ?? r.rows
    let head = !r.any.isEmpty && typed.isEmpty ? [PickRow(id: "", words: r.any)] : []
    let other = r.other != nil && !typed.isEmpty && !found.contains { $0.words.lowercased() == typed.lowercased() } ? r.other!(typed) : nil
    VStack(alignment: .leading, spacing: 14) {
      HStack(spacing: 12) {
        Text(r.title).css(20, .semibold, ls: -0.02).line(20).frame(maxWidth: .infinity, alignment: .leading)
        Button(action: close) { Icon("close", 14, 2.2).foregroundStyle(t.text).frame(width: 36, height: 36).background(Circle().fill(t.surf)) }
          .buttonStyle(.press).accessibilityLabel("Close")
      }
      if r.find != nil { search }
      // A short list is a short sheet, as tall as its rows; a long one or a search scrolls.
      let rows = VStack(alignment: .leading, spacing: 0) {
        ForEach(head + found) { row in rowView(row) }
        if r.find != nil && !typed.isEmpty && found.isEmpty { Text(r.noneLine).css(15).foregroundStyle(t.muted).padding(.horizontal, 4).padding(.vertical, 10) }
        if let other {
          Button { r.chooseOther(typed); close() } label: {
            Text(other).css(16, .semibold).lineLimit(1).foregroundStyle(t.text).padding(.horizontal, 16).frame(maxWidth: .infinity, minHeight: 48, alignment: .leading)
              .background(RoundedRectangle(cornerRadius: 16, style: .continuous).fill(t.surf))
          }
          .buttonStyle(.press).padding(.top, 4)
        }
      }
      if r.full {
        ScrollView(showsIndicators: false) { rows.padding(.bottom, keyboard.height > 0 ? keyboard.height : 0) }
          .scrollDismissesKeyboard(.interactively)
          .frame(maxHeight: .infinity)
      } else { rows }
    }
    .foregroundStyle(t.text)
    .padding(.top, 20).padding(.horizontal, 20).padding(.bottom, 34)
    .frame(maxHeight: r.full ? .infinity : nil, alignment: .top)
    // The cursor goes to the search (the design screens, like the canvas's, leave it alone), and the list is read in the background so
    // the first letters find schools at once.
    .onAppear {
      guard let find = r.find else { return }
      DispatchQueue.global(qos: .userInitiated).async { _ = find("") }
      if !store.demo { DispatchQueue.main.asyncAfter(deadline: .now() + 0.35) { focus = true } }
    }
  }

  private var search: some View {
    HStack(spacing: 8) {
      Icon("search", 14, 1.8).foregroundStyle(t.muted)
      TextField("", text: $q, prompt: Text(r.placeholder).foregroundStyle(PLACEHOLDER))
        .font(.geist(16)).foregroundStyle(t.text).textInputAutocapitalization(.never).autocorrectionDisabled().submitLabel(.search)
        .focused($focus)
        .accessibilityLabel(r.placeholder)
    }
    .padding(.horizontal, 14).frame(height: 44)
    .background(Capsule().fill(t.surf))
  }

  private func rowView(_ row: PickRow) -> some View {
    let on = row.id.isEmpty ? r.value.isEmpty : row.id == r.value
    return Button { r.choose(row.id.isEmpty ? nil : row); close() } label: {
      HStack(spacing: 10) {
        VStack(alignment: .leading, spacing: 1) {
          Text(row.words).css(16).lineLimit(1).line(16)
          if !row.sub.isEmpty { Text(row.sub).css(13).foregroundStyle(t.muted).lineLimit(1).line(13) }
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        if on { Icon("check", 15, 2.4) }
      }
      .padding(.horizontal, 4).padding(.vertical, 8).frame(minHeight: 52)
      .overlay(alignment: .bottom) { Rectangle().fill(t.line).frame(height: 1) }
      .contentShape(Rectangle())
    }
    .buttonStyle(.flat)
    .accessibilityAddTraits(on ? .isSelected : [])
    .accessibilityLabel(row.sub.isEmpty ? row.words : row.words + ", " + row.sub)
  }
}

extension PickRow {
  /// The schools some typed words find, as rows (their name, and "City, ST" under it).
  static func schools(_ q: String) -> [PickRow] { SchoolList.shared.find(q).map { PickRow(id: $0.id, words: $0.name, sub: $0.place) } }
  /// The same on a design screen: the canvas's few sample schools, found by the words they start with, in its order (mock.mjs schools.find).
  static func sampleSchools(_ q: String) -> [PickRow] {
    let w = SchoolList.split(q)
    guard !w.isEmpty else { return [] }
    return NetSample.shared.SCHOOLS.filter { r in
      let hay = SchoolList.split(r[1] + " " + r[2] + " " + r[3] + " " + (r.count > 4 ? r[4] : ""))
      return w.allSatisfy { x in hay.contains { $0.hasPrefix(x) } }
    }.map { PickRow(id: $0[0], words: $0[1], sub: $0[2] + ", " + $0[3]) }
  }
  static let levels = Generated.levels.map { PickRow(id: $0.id, words: $0.words) }
  static let subjects = Generated.subjects.map { PickRow(id: $0.id, words: $0.words) }
}
