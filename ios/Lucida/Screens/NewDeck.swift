// iPhone · New deck (PhoneNewDeck): a sheet over Today. The cover starts white; its colors (made from the name) fade in
// over 2 seconds once you stop typing or press Shuffle. Image picks a photo for its header instead.
import SwiftUI

extension Store {
  /// Makes a deck (with a header photo, when one was picked) and returns its id.
  func addDeck(name: String, tags: [String], perDay: Int, goal: Int, grading: String, round: Int, image: String? = nil) async -> String? {
    if demo { return "cell" }
    let r = await send("deck.add", ["name": name, "tags": tags, "perDay": perDay, "goal": goal, "grading": grading, "style": lib.settings.grads, "round": round, "image": image ?? NSNull()])
    return r["id"] as? String
  }
}

struct NewDeckSheet: View {
  @Environment(\.theme) private var t
  @EnvironmentObject private var store: Store
  @EnvironmentObject private var nav: Nav
  @State private var name = ""
  @State private var tags: [String] = []
  @State private var round = 0
  @State private var perDay: Int? = nil
  @State private var goal: Int? = nil
  @State private var grading: String? = nil
  /// The cover's seed on show, and the one fading out under it.
  @State private var shown: String? = nil
  @State private var fade = 0.0
  @State private var prev: String? = nil
  @State private var settle: Task<Void, Never>?
  @State private var tagPicker = false
  @State private var busy = false
  /// A header photo picked with Image (uploaded already), and whether the photo picker is up.
  @State private var image: String? = nil
  @State private var picking = false

  init(demo: Bool = false) {
    if demo { _name = State(initialValue: "Pharmacology"); _tags = State(initialValue: ["MCAT"]) }
  }

  var body: some View {
    let s = store.settings, title = name.trimmingCharacters(in: .whitespaces).isEmpty ? "Untitled deck" : name.trimmingCharacters(in: .whitespaces)
    let perDay = self.perDay ?? s.perDay, goal = self.goal ?? s.goal, grading = self.grading ?? s.grading
    let style = store.demo ? store.props.grads : s.grads
    ZStack {
      VStack(alignment: .leading, spacing: 16) {
        HStack {
          Text("New deck").css(22, .semibold, ls: -0.02)
          Spacer()
          Button(action: nav.close) { Icon("close", 16, 2).foregroundStyle(t.text).frame(width: 40, height: 40).background(Circle().fill(t.surf)) }
            .buttonStyle(.press).accessibilityLabel("Close")
        }
        cover(title, style: style)
        VStack(alignment: .leading, spacing: 8) {
          Text("Name").css(13, .semibold)
          TextField("", text: $name, prompt: Text("Name your deck").foregroundStyle(t.muted))
            .font(.geist(16)).foregroundStyle(t.text).submitLabel(.done)
            .padding(.horizontal, 16).frame(height: 48)
            .background(RoundedRectangle(cornerRadius: 16, style: .continuous).fill(t.surf))
            .onChange(of: name) { _, v in typed(v) }
        }
        VStack(alignment: .leading, spacing: 8) {
          Text("Tags").css(13, .semibold)
          TagEditor(tags: tags, remove: { g in tags.removeAll { $0 == g } }, add: { tagPicker = true })
        }
        HStack(spacing: 8) {
          StackedStepper(label: "New cards a day", value: "\(perDay)", less: { self.perDay = max(0, perDay - 5) }, more: { self.perDay = min(999, perDay + 5) })
          StackedStepper(label: "Remember goal", value: "\(goal)%", less: { self.goal = max(70, goal - 1) }, more: { self.goal = min(97, goal + 1) })
        }
        VStack(alignment: .leading, spacing: 8) {
          Text("Grade with").css(13, .semibold)
          Segmented(options: [("four", "4 grades"), ("binary", "✓ / ✗"), ("piles", "Piles")], current: grading, hPad: 8) { self.grading = $0 }
        }
        FlexRow(spacing: 10) {
          Button(action: nav.close) { Text("Cancel").css(15, .semibold).foregroundStyle(t.text).frame(maxWidth: .infinity).frame(height: 52).background(Capsule().fill(t.surf)) }
            .buttonStyle(.press)
          Button {
            guard !busy else { return }
            busy = true
            Task {
              if let id = await store.addDeck(name: title, tags: tags, perDay: perDay, goal: goal, grading: grading, round: round, image: image) {
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
      if tagPicker {
        TagPicker(all: store.demo ? Array(Generated.tagColors.keys) : store.engine.tags, current: tags, set: { tags = $0 }, close: { tagPicker = false })
          .background(t.bg)
      }
    }
    .photoPicker($picking) { url in if !store.demo { image = url } }
  }

  /// The cover: white until a name settles, then its gradient fades in over the last one.
  private func cover(_ title: String, style: String) -> some View {
    let mesh = shown.map { Mesh.gen($0, style) }, photo = image.flatMap { store.api.mediaURL($0) }
    return ZStack(alignment: .topLeading) {
      t.bg
      if let prev { MeshFill(mesh: Mesh.gen(prev, style)) }
      if let mesh { MeshFill(mesh: mesh).opacity(fade) }
      if let photo { FillPhoto(url: photo) }
      VStack(alignment: .leading, spacing: 0) {
        HStack(spacing: 8) {
          Spacer()
          // Shuffle goes back to colors, like the deck's own Shuffle.
          coverButton("Shuffle", "shuffle") { image = nil; show(seed(title, round + 1)); round += 1 }
          coverButton("Image", "image") { picking = true }
        }
        Spacer(minLength: 0)
        // White words on a photo, like a deck's header.
        Text(title).css(22, .semibold, ls: -0.02).lineLimit(1)
          .foregroundStyle(photo != nil ? .white : mesh?.inkColor ?? t.text)
          .shadow(color: .black.opacity(photo != nil ? 0.45 : mesh?.shadow ?? 0), radius: 7, y: 1)
          .animation(.easeInOut(duration: 2), value: shown)
      }
      .padding(.top, 14).padding(.trailing, 16).padding(.bottom, 16).padding(.leading, 18)
    }
    .frame(height: 132)
    .clipShape(RoundedRectangle(cornerRadius: 26, style: .continuous))
    .overlay(RoundedRectangle(cornerRadius: 26, style: .continuous).strokeBorder(t.line, lineWidth: 1))
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
