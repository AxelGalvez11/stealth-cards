// iPhone · Library · New folder popup (PhoneLibraryNewFolder; the owner: "'new folder' button should bring up a popup
// menu"). Over the dimmed page: its title, a focused name field, Cancel and Create. The return key creates it; Cancel or a
// tap outside closes it. A deck's ⋯ menu opens it for that deck ("“Cell Biology” goes in it."), and Rename on a folder's
// page opens it with the folder's name picked and Save (folderPopup in design/build.mjs).
import SwiftUI

struct FolderPopup: View {
  @Environment(\.theme) private var t
  @Environment(\.accessibilityReduceMotion) private var still
  @EnvironmentObject private var store: Store
  @EnvironmentObject private var nav: Nav
  /// The folder being renamed (nil: a new one), a deck that goes in the new one, and what's typed to start with.
  let rename: String?
  let deck: String?
  let start: String
  @State private var name = ""
  @State private var selection: TextSelection? = nil
  @FocusState private var focused: Bool
  @State private var shown = false

  var body: some View {
    let typed = name.trimmingCharacters(in: .whitespaces)
    let mover = deck.flatMap { id in store.libraryDecks().first { $0.id == id } }
    GeometryReader { g in
      ZStack(alignment: .top) {
        t.dim.onTapGesture(perform: close).opacity(shown ? 1 : 0)
        VStack(alignment: .leading, spacing: 16) {
          VStack(alignment: .leading, spacing: 4) {
            Text(rename != nil ? "Rename folder" : "New folder").css(20, .semibold, ls: -0.02).accessibilityAddTraits(.isHeader)
            if rename == nil {
              Text(mover.map { "“\($0.name)” goes in it." } ?? "Then drag decks onto it.").css(14, lh: 1.4).foregroundStyle(t.muted)
            }
          }
          HStack(spacing: 10) {
            Icon("folder", 18, 1.8).foregroundStyle(t.muted)
            TextField("", text: $name, selection: $selection, prompt: Text("Folder name").foregroundStyle(t.muted))
              .font(.geist(16)).foregroundStyle(t.text).tint(t.text)
              .focused($focused).submitLabel(.done).onSubmit(save)
              .autocorrectionDisabled()
              .accessibilityLabel("Folder name")
              .onChange(of: name) { _, v in if v.count > 80 { name = String(v.prefix(80)) } }
          }
          .padding(.horizontal, 16).frame(height: 50)
          .background(RoundedRectangle(cornerRadius: 16, style: .continuous).fill(t.surf))
          .overlay(RoundedRectangle(cornerRadius: 16, style: .continuous).strokeBorder(t.text, lineWidth: 2))
          HStack(spacing: 10) {
            Button(action: close) {
              Text("Cancel").css(15, .semibold).foregroundStyle(t.text).frame(maxWidth: .infinity).frame(height: 48).background(Capsule().fill(t.surf))
            }
            .buttonStyle(.press)
            // Nothing typed yet: it waits in gray.
            Button(action: save) {
              Text(rename != nil ? "Save" : "Create").css(15, .semibold).foregroundStyle(typed.isEmpty ? t.muted : t.invText)
                .frame(maxWidth: .infinity).frame(height: 48).background(Capsule().fill(typed.isEmpty ? t.surf2 : t.inv))
                .animation(.easeOut(duration: 0.15), value: typed.isEmpty)
            }
            .buttonStyle(.press)
          }
        }
        .foregroundStyle(t.text)
        .padding(20)
        .background(RoundedRectangle(cornerRadius: 28, style: .continuous).fill(t.bg))
        .padding(.horizontal, 16)
        .padding(.top, (g.size.height * 0.2).rounded())
        // It rises in (.sc-pop).
        .opacity(shown ? 1 : 0).scaleEffect(shown ? 1 : 0.97).offset(y: shown ? 0 : 12)
        .accessibilityElement(children: .contain)
        .accessibilityAddTraits(.isModal)
      }
    }
    .ignoresSafeArea()
    .onAppear {
      name = start
      withAnimation(still ? nil : .out(0.26)) { shown = true }
      // Ready to type in (a name being changed is picked once the field has the focus, to type over it).
      DispatchQueue.main.async { focused = true }
      if rename != nil {
        DispatchQueue.main.asyncAfter(deadline: .now() + 0.15) { selection = TextSelection(range: name.startIndex..<name.endIndex) }
      }
    }
  }

  private func close() { focused = false; nav.sheet = nil }

  private func save() {
    let n = name.trimmingCharacters(in: .whitespaces)
    guard !n.isEmpty else { return }
    close()
    if let id = rename { store.renameFolder(id, n) } else { let d = deck; Task { await store.newFolder(n, deck: d) } }
  }
}
