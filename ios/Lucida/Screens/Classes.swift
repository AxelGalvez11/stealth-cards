// iPhone · Library · Classes (PhoneClasses, PhoneClassesEmpty, PhoneClassesJoin, PhoneClassesNew, and the Dark twin): the
// Library's third view, after Decks and All cards. Your classes as tiles in their own colors (from the name), each with a
// badge (Yours, Helper, Official), how many assignments wait for you, and its school and people, then whose it is and how
// many decks. A button to join a class with its code, and one to make a class; each opens a small popup. Tapping a class
// opens its page.
import SwiftUI

/// The popups that name things: a new class, joining one with its code, or renaming yours (its id, name, and school).
enum ClassForm: Equatable {
  case new, join
  case rename(id: String, name: String, school: String)
  var id: String {
    switch self {
    case .new: return "new"
    case .join: return "join"
    case .rename(let id, _, _): return "rename-" + id
    }
  }
}

struct ClassesScreen: View {
  @Environment(\.theme) private var t
  @EnvironmentObject private var store: Store
  @EnvironmentObject private var nav: Nav

  var body: some View {
    let answer = store.netClasses()
    let bad = answer?.isMissing == true || answer?.isOffline == true
    let list = answer?.value ?? []
    let todo = store.assignmentRows()
    ScrollView(showsIndicators: false) {
      VStack(alignment: .leading, spacing: 14) {
        HStack(spacing: 8) {
          Text("Library").css(32, .bold, ls: -0.03).foregroundStyle(t.text).frame(maxWidth: .infinity, alignment: .leading).accessibilityAddTraits(.isHeader)
          LibRound(icon: "enter", label: "Join a class") { nav.sheet = .classForm(.join) }
          LibRound(icon: "plus", label: "New class", inv: true) { nav.sheet = .classForm(.new) }
        }
        .frame(height: 41)
        LibraryModes(current: "classes")
        if answer == nil { NetLoading(rows: 1) }
        if !list.isEmpty {
          VStack(spacing: 14) {
            ForEach(list) { k in
              VStack(alignment: .leading, spacing: 8) {
                tile(k, waiting: todo.filter { $0.classId == k.id && !$0.done }.count)
                ownerRow(k)
              }
            }
          }
        }
        if answer != nil && !bad && list.isEmpty { none }
        if bad { offline }
      }
      .padding(.horizontal, 20).padding(.top, Screen.top(64)).padding(.bottom, 120)
    }
    .ignoresSafeArea(edges: .top)
    .onAppear {
      // The design screens with a popup open (the canvas's Tweaks) open it once the page is showing.
      if store.demo, !store.props.classForm.isEmpty {
        let f = store.props.classForm; store.props.classForm = ""
        nav.sheet = .classForm(f == "join" ? .join : .new)
      }
    }
  }

  /// CLASS_TILE: its colors (from its name), a badge and what's waiting for you, its name, and its school and people.
  private func tile(_ k: ClassRow, waiting: Int) -> some View {
    let badge = k.role == "owner" ? "Yours" : k.role == "helper" ? "Helper" : k.official ? "Official" : ""
    let line = [k.school, ClassWords.nOf(k.people, "person", "people")].filter { !$0.isEmpty }.joined(separator: " · ")
    return Button { nav.classPage(k.code) } label: {
      ClassTile(mesh: Mesh.gen(k.name.isEmpty ? "Class" : k.name, "mix"), name: k.name, line: line, badge: badge, official: badge == "Official",
                toDo: waiting > 0 ? ClassWords.nOf(waiting, "assignment") : "", height: 150, nameSize: 22)
    }
    .buttonStyle(.press)
    .accessibilityElement(children: .ignore)
    .accessibilityLabel([k.name, badge, waiting > 0 ? ClassWords.nOf(waiting, "assignment") : "", line].filter { !$0.isEmpty }.joined(separator: ", "))
    .accessibilityAddTraits(.isButton)
  }

  /// Whose class it is, and how many decks it has.
  private func ownerRow(_ k: ClassRow) -> some View {
    Button { nav.profile(k.owner.handle) } label: {
      HStack(spacing: 8) {
        PersonAvatar(p: k.owner, size: 20)
        Text(k.owner.name).css(13, .semibold).lineLimit(1).line(13)
        VerifiedMark(p: k.owner)
        Spacer(minLength: 8)
        Text(ClassWords.nOf(k.decks, "deck")).css(13).foregroundStyle(t.muted).fixedSize().line(13)
      }
      .foregroundStyle(t.text)
      .padding(.horizontal, 2)
      .contentShape(Rectangle())
    }
    .buttonStyle(.flat)
    .accessibilityElement(children: .ignore)
    .accessibilityLabel("\(k.owner.name), \(ClassWords.nOf(k.decks, "deck"))")
    .accessibilityAddTraits(.isButton)
  }

  /// classesEmpty: no classes yet, and the two ways to have one.
  private var none: some View {
    VStack(spacing: 18) {
      Icon("people", 26, 1.8).foregroundStyle(t.text).frame(width: 56, height: 56).background(Circle().fill(t.bg))
      Text("No classes yet").css(20, .semibold).line(20)
      HStack(spacing: 8) {
        ClassButton(label: "Join a class", icon: "enter") { nav.sheet = .classForm(.join) }
        ClassButton(label: "New class", icon: "plus", inv: true) { nav.sheet = .classForm(.new) }
      }
    }
    .foregroundStyle(t.text)
    .frame(maxWidth: .infinity)
    .padding(.horizontal, 24).padding(.vertical, 72)
    .background(RoundedRectangle(cornerRadius: 24, style: .continuous).fill(t.surf))
  }

  private var offline: some View {
    CSSText("Couldn’t reach Lucida. Check your connection.", 15, color: t.muted, align: .center)
      .frame(maxWidth: .infinity)
      .padding(.horizontal, 24).padding(.vertical, 48)
      .background(RoundedRectangle(cornerRadius: 24, style: .continuous).fill(t.surf))
  }
}

/// CLASS_TILE: a class as a tile in its own colors: a badge (Yours, Helper, Official) and what's waiting for you at the
/// top, its name and its school and people at the bottom.
struct ClassTile: View {
  let mesh: Mesh
  let name: String, line: String
  var badge = "", official = false, toDo = ""
  let height: CGFloat
  var nameSize: CGFloat = 22
  var body: some View {
    ZStack(alignment: .topLeading) {
      MeshFill(mesh: mesh)
      VStack(alignment: .leading, spacing: 0) {
        HStack(spacing: 6) {
          if !badge.isEmpty { GlassChip(text: badge, shield: official) }
          if !toDo.isEmpty { GlassChip(text: toDo) }
        }
        .frame(minHeight: 24, alignment: .leading)
        Spacer(minLength: 0)
        VStack(alignment: .leading, spacing: 4) {
          LabelText(text: Rich.nsText([.init(t: name, m: "")], size: nameSize, weight: .semibold, ls: -0.02, lh: 1.1, color: UIColor(mesh.inkColor), dark: false), lines: 2, clamp: true)
          Text(line).css(13).lineLimit(1).line(13).opacity(0.88)
        }
        .shadow(color: .black.opacity(mesh.shadow), radius: mesh.shadow > 0 ? 7 : 0, x: 0, y: mesh.shadow > 0 ? 1 : 0)
      }
      .foregroundStyle(mesh.inkColor)
      .padding(.horizontal, 18).padding(.vertical, 16)
      .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .topLeading)
    }
    .frame(height: height)
    .clipShape(RoundedRectangle(cornerRadius: 20, style: .continuous))
  }
}

/// New class, Join a class, and Rename class (CLASS_FORM): a small popup over the dimmed page with its fields ready to
/// type in. Return does what the main button does; Cancel or a tap outside closes it. What the server says when it
/// didn't work (No class has that code…) shows under the fields.
struct ClassPopup: View {
  @Environment(\.theme) private var t
  @Environment(\.accessibilityReduceMotion) private var still
  @EnvironmentObject private var store: Store
  @EnvironmentObject private var nav: Nav
  let form: ClassForm
  @State private var name = ""
  @State private var school = ""
  @State private var code = ""
  @State private var err = ""
  @State private var busy = false
  @State private var shown = false
  @FocusState private var focused: Bool

  var body: some View {
    let join = form == .join
    let ok = join ? code.range(of: "^[A-Z]{6}$", options: .regularExpression) != nil : !name.trimmingCharacters(in: .whitespaces).isEmpty
    let title: String = { switch form { case .new: return "New class"; case .join: return "Join a class"; case .rename: return "Rename class" } }()
    let action: String = { switch form { case .new: return "Create"; case .join: return "Join"; case .rename: return "Save" } }()
    GeometryReader { g in
      ZStack(alignment: .top) {
        t.dim.onTapGesture(perform: close).opacity(shown ? 1 : 0)
        VStack(alignment: .leading, spacing: 14) {
          Text(title).css(22, .semibold, ls: -0.02).line(22).accessibilityAddTraits(.isHeader)
          if join {
            ClassField(text: $code, placeholder: "Code", label: "Class code", icon: "enter", mono: true, max: 12, caps: .characters, focus: $focused, submit: { save(ok) })
              .onChange(of: code) { _, v in
                let f = String(v.uppercased().filter { $0 >= "A" && $0 <= "Z" }.prefix(6))
                if f != v { code = f }
                err = ""
              }
          } else {
            ClassField(text: $name, placeholder: "Name, like BIO 201", label: "Class name", icon: "people", max: 60, focus: $focused, submit: { save(ok) })
            ClassField(text: $school, placeholder: "School (if you like)", label: "School", icon: "cap", max: 60, submit: { save(ok) })
          }
          ErrLine(text: err)
          HStack(spacing: 10) {
            Button(action: close) {
              Text("Cancel").css(15, .semibold).foregroundStyle(t.text).frame(maxWidth: .infinity).frame(height: 48).background(Capsule().fill(t.surf))
            }
            .buttonStyle(.press)
            // Nothing to go on yet: it waits in gray.
            Button { save(ok) } label: {
              Text(action).css(15, .semibold).foregroundStyle(ok ? t.invText : t.muted)
                .frame(maxWidth: .infinity).frame(height: 48).background(Capsule().fill(ok ? t.inv : t.surf2))
                .animation(.easeOut(duration: 0.15), value: ok)
            }
            .buttonStyle(.press)
            .accessibilityAddTraits(ok ? [] : .isStaticText)
          }
        }
        .foregroundStyle(t.text)
        .padding(20)
        .background(RoundedRectangle(cornerRadius: 28, style: .continuous).fill(t.bg))
        .padding(.horizontal, 16)
        .padding(.top, (g.size.height * 0.12).rounded())
        // It rises in (.sc-pop).
        .opacity(shown ? 1 : 0).scaleEffect(shown ? 1 : 0.97).offset(y: shown ? 0 : 12)
        .accessibilityElement(children: .contain)
        .accessibilityAddTraits(.isModal)
      }
    }
    .ignoresSafeArea()
    .onAppear {
      switch form {
      case .new: if store.demo { name = "BIO 201"; school = "UC Davis" }
      case .join: if store.demo { code = "BIOKTZ" }
      case .rename(_, let n, let s): name = n; school = s
      }
      withAnimation(still ? nil : .out(0.26)) { shown = true }
      DispatchQueue.main.async { focused = true }
    }
  }

  private func close() { focused = false; nav.sheet = nil }

  private func save(_ ok: Bool) {
    guard ok, !busy else { return }
    busy = true; err = ""
    let n = name.trimmingCharacters(in: .whitespaces), s = school.trimmingCharacters(in: .whitespaces)
    Task {
      do {
        switch form {
        case .new:
          let c = try await store.makeClass(name: n, school: s)
          close(); if !c.isEmpty { nav.classPage(c) }
        case .join:
          let c = try await store.joinClass(code)
          close(); nav.classPage(c)
        case .rename(let id, _, _):
          try await store.updateClass(id, name: n, school: s)
          close()
        }
      } catch { err = error.localizedDescription.nilIfEmpty ?? "Something went wrong. Try again."; busy = false }
    }
  }
}
