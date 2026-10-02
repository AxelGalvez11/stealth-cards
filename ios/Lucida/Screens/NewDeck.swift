// iPhone · New deck (PhoneNewDeck): a sheet over the Library; Create deck opens the new deck on its empty page, ready for material. The cover starts white; its colors (made from the name) fade in
// over 2 seconds once you stop typing or press Shuffle. Image picks a photo for its header instead. The name is typed on the cover itself (the owner, 2026-10-02: "remove 'name' section, allow
// users to directly edit the name in the box above"); a deck has no tags (only cards do), and it grades the way Settings says until Deck settings → Studying changes it.
import SwiftUI

extension Store {
  /// Makes a deck (with a header photo, when one was picked) and returns its id. Its grading is Settings' (the server's default).
  func addDeck(name: String, perDay: Int, goal: Int, round: Int, image: String? = nil) async -> String? {
    if demo { return "cell" }
    let r = await send("deck.add", ["name": name, "perDay": perDay, "goal": goal, "style": lib.settings.grads, "round": round, "image": image ?? NSNull()])
    return r["id"] as? String
  }
}

struct NewDeckSheet: View {
  @Environment(\.theme) private var t
  @EnvironmentObject private var store: Store
  @ObservedObject private var art = ThemeArt.shared
  @EnvironmentObject private var nav: Nav
  @State private var name = ""
  /// The name's field on the cover is being typed in (with a theme on, the theme's lettering shows when it isn't).
  @FocusState private var naming: Bool
  @State private var round = 0
  @State private var perDay: Int? = nil
  @State private var goal: Int? = nil
  /// The cover's seed on show, and the one fading out under it.
  @State private var shown: String? = nil
  @State private var fade = 0.0
  @State private var prev: String? = nil
  @State private var settle: Task<Void, Never>?
  @State private var busy = false
  /// A header photo picked with Image (uploaded already), and whether the photo picker is up.
  @State private var image: String? = nil
  @State private var picking = false

  init(demo: Bool = false) {
    if demo { _name = State(initialValue: "Pharmacology") }
  }

  var body: some View {
    let s = store.settings, title = name.trimmingCharacters(in: .whitespaces).isEmpty ? "Untitled deck" : name.trimmingCharacters(in: .whitespaces)
    let perDay = self.perDay ?? s.perDay, goal = self.goal ?? s.goal
    let style = store.demo ? store.props.grads : s.grads
    VStack(alignment: .leading, spacing: 16) {
      HStack {
        Text("New deck").css(22, .semibold, ls: -0.02)
        Spacer()
        Button(action: nav.close) { Icon("close", 16, 2).foregroundStyle(t.text).frame(width: 40, height: 40).background(Circle().fill(t.surf)) }
          .buttonStyle(.press).accessibilityLabel("Close")
      }
      cover(title, style: style)
      HStack(spacing: 8) {
        StackedStepper(label: "New cards a day", value: "\(perDay)", less: { self.perDay = max(0, perDay - 5) }, more: { self.perDay = min(999, perDay + 5) })
        StackedStepper(label: "Remember goal", value: "\(goal)%", less: { self.goal = max(70, goal - 1) }, more: { self.goal = min(97, goal + 1) })
      }
      FlexRow(spacing: 10) {
        Button(action: nav.close) { Text("Cancel").css(15, .semibold).foregroundStyle(t.text).frame(maxWidth: .infinity).frame(height: 52).background(Capsule().fill(t.surf)) }
          .buttonStyle(.press)
        Button {
          guard !busy else { return }
          busy = true
          Task {
            if let id = await store.addDeck(name: title, perDay: perDay, goal: goal, round: round, image: image) {
              Buzz.shared.success("deck made")
              nav.sheet = nil
              if !store.demo { nav.tab = .library; nav.path = [.deck(id)] }
            }
            busy = false
          }
        } label: {
          Text("Create deck").css(15, .semibold).foregroundStyle(t.invText).frame(maxWidth: .infinity).frame(height: 52).background(Capsule().fill(t.inv))
        }
        .buttonStyle(.press)
        .grow(2)
      }
    }
    .foregroundStyle(t.text)
    .padding(.top, 16).padding(.horizontal, 20).padding(.bottom, 34)
    .photoPicker($picking) { url in if !store.demo { image = url } }
  }

  /// The cover: white until a name settles, then its gradient fades in over the last one.
  private func cover(_ title: String, style: String) -> some View {
    let mesh = shown.map { Mesh.gen($0, style) }, photo = image.flatMap { store.api.mediaURL($0) }
    // With a theme on (Pro), the theme's cover for this name (the one the deck gets), which changes once you stop typing; its
    // lettering too. A picture of your own takes its place.
    let skin = image == nil ? store.skin(art) : nil
    let look = ThemeDeck(name: title, seed: shown.map { $0.replacingOccurrences(of: #" #\d+$"#, with: "", options: .regularExpression) } ?? title, round: round, tags: [])
    let coverW = ThemeLayout.screen.width - 40
    let themed = skin.flatMap { art.picture(.newCover($0, deck: look, size: CGSize(width: coverW, height: 132))) }
    let name = skin.map { ThemeJob.newName($0, deck: look, width: coverW - 34) }
    return ZStack(alignment: .topLeading) {
      t.bg
      if let prev { MeshFill(mesh: Mesh.gen(prev, style)) }
      if let mesh { MeshFill(mesh: mesh).opacity(fade) }
      if let themed { Color.clear.overlay(alignment: .topLeading) { themed.placed }.themeMark("newcover", store.skinKey ?? "") }
      if let photo { FillPhoto(url: photo) }
      VStack(alignment: .leading, spacing: 0) {
        HStack(spacing: 8) {
          Spacer()
          // Shuffle goes back to colors, like the deck's own Shuffle.
          coverButton("Shuffle", "shuffle") { image = nil; show(seed(title, round + 1)); round += 1 }
          coverButton("Image", "image") { picking = true }
        }
        Spacer(minLength: 0)
        nameField(lettering: themed != nil ? name : nil, ink: photo != nil ? .white : mesh?.inkColor ?? t.text, shadow: photo != nil ? 0.45 : mesh?.shadow ?? 0)
      }
      .padding(.top, 14).padding(.trailing, 16).padding(.bottom, 16).padding(.leading, 18)
    }
    .frame(height: 132)
    .clipShape(RoundedRectangle(cornerRadius: 26, style: .continuous))
    .overlay(RoundedRectangle(cornerRadius: 26, style: .continuous).strokeBorder(t.line, lineWidth: 1))
  }

  /// The deck's name, typed on the cover in its own ink (white words on a photo, like a deck's header). With a theme on, the theme's lettering
  /// stands in for the words while you aren't typing.
  private func nameField(lettering: ThemeJob?, ink: Color, shadow: Double) -> some View {
    let drawn = lettering != nil && !naming
    return ZStack(alignment: .leading) {
      if let lettering, drawn { ThemedName(job: lettering).accessibilityHidden(true).allowsHitTesting(false) }
      TextField("", text: $name, prompt: drawn ? nil : Text("Untitled deck").foregroundStyle(ink.opacity(0.5)))
        .focused($naming)
        .css(22, .semibold, ls: -0.02).lineLimit(1)
        .foregroundStyle(drawn ? .clear : ink).tint(ink)
        .submitLabel(.done)
        .shadow(color: .black.opacity(drawn ? 0 : shadow), radius: 7, y: 1)
        .animation(.easeInOut(duration: 2), value: shown)
        .accessibilityLabel("Deck name")
        .onChange(of: name) { _, v in typed(v) }
    }
  }

  private func coverButton(_ label: String, _ icon: String, _ action: @escaping () -> Void) -> some View {
    Button(action: action) {
      HStack(spacing: 6) { Icon(icon, 14, 2); Text(label).css(13, .semibold) }
        .foregroundStyle(Color.black).padding(.horizontal, 14).frame(height: 36)
        .background(Capsule().fill(.ultraThinMaterial)).background(Capsule().fill(Color.white.opacity(0.62)))
        .overlay(Capsule().strokeBorder(Color.black.opacity(0.08), lineWidth: 1))
        .clipShape(Capsule())
    }
    .buttonStyle(.press)
  }

  private func seed(_ title: String, _ r: Int) -> String { title + (r > 0 ? " #\(r)" : "") }

  /// A moment after you stop typing a name, its colors fade in.
  private func typed(_ v: String) {
    settle?.cancel()
    settle = Task {
      try? await Task.sleep(nanoseconds: 800_000_000)
      guard !Task.isCancelled else { return }
      let title = v.trimmingCharacters(in: .whitespaces)
      if !title.isEmpty && seed(title, round) != shown { show(seed(title, round)) }
    }
  }
  private func show(_ s: String) {
    prev = shown
    shown = s
    fade = 0
    withAnimation(.easeInOut(duration: 2)) { fade = 1 }
    Task { try? await Task.sleep(nanoseconds: 2_100_000_000); if shown == s { prev = nil } }
  }
}
