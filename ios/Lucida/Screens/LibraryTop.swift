// The top of the Library (design/home.mjs; the boards PhoneLibrary, PhoneLibraryFolder, PhoneLibraryAssigned, PhoneDecksEmpty and
// PhoneDeckEmpty): the Make box ("What do you want to study?"), its row (Upload, Paste, YouTube, More), what's due, and what your classes
// assigned. The app opens on the Library (there is no Today page, the owner, 2026-10-01), so this is where decks are made and material
// goes in. Each piece is a small view of its own, so the Library's page stays light to lay out.
import SwiftUI

/// What words in the Make box are (home.mjs kindOf): a YouTube link, a long paste (more than one line, or longer than a topic holds), or a topic.
enum StudyWords {
  static func kind(_ s: String) -> String {
    let w = s.trimmingCharacters(in: .whitespacesAndNewlines)
    if w.range(of: #"^(https?://)?([\w-]+\.)*(youtube\.com|youtu\.be|youtube-nocookie\.com)/\S+$"#, options: [.regularExpression, .caseInsensitive]) != nil { return "video" }
    return w.contains("\n") || w.utf16.count > 200 ? "paste" : "topic"
  }
  /// Opens the Make flow on the words' kind with them already in (`deckId`: the cards go to that deck; `folder`: a new deck goes in it).
  @MainActor static func make(_ words: String, nav: Nav, deckId: String, folder: String) {
    let w = words.trimmingCharacters(in: .whitespacesAndNewlines)
    guard w.count >= 2 else { return }
    switch kind(w) {
    case "video": nav.make(kind: "video", deckId: deckId, url: w, folder: folder)
    case "paste": nav.make(kind: "paste", deckId: deckId, text: w, folder: folder, box: true)
    default: nav.make(kind: "topic", deckId: deckId, topic: w, folder: folder)
    }
  }
}

/// The Make box: the words, its + (Upload) and Make cards (pale until there are words). Return at the end makes cards from the words; a link
/// or a long text pasted into it starts that kind at once.
struct MakeBox: View {
  @Environment(\.theme) private var t
  @EnvironmentObject private var nav: Nav
  var deckId = "", folder = ""
  @State private var text = ""
  @FocusState private var focused: Bool
  var body: some View {
    let ready = text.trimmingCharacters(in: .whitespacesAndNewlines).count >= 2
    VStack(alignment: .leading, spacing: 6) {
      TextField("", text: $text, prompt: Text("What do you want to study?").foregroundStyle(PLACEHOLDER), axis: .vertical)
        .font(.geist(17)).foregroundStyle(t.text).lineLimit(2...4)
        // (The board's two lines are 50 points: 17 at a line height of 1.45.)
        .frame(minHeight: 50, alignment: .topLeading)
        .submitLabel(.go)
        .focused($focused)
        .onChange(of: text) { old, new in typed(old, new) }
        .accessibilityLabel("What do you want to study?")
        .accessibilityIdentifier("makeBox")
      HStack(spacing: 12) {
        Button { focused = false; nav.make(kind: "file", deckId: deckId, folder: folder) } label: {
          Icon("plus", 18, 2).foregroundStyle(t.text).frame(width: 36, height: 36).background(Circle().fill(t.bg))
        }
        .buttonStyle(.press)
        .accessibilityLabel("Upload")
        Spacer(minLength: 0)
        Button { go(text) } label: {
          Icon("arrowUp", 18, 2.2).foregroundStyle(ready ? t.invText : t.muted).frame(width: 36, height: 36).background(Circle().fill(ready ? t.inv : t.surf2))
        }
        .buttonStyle(.press)
        .accessibilityLabel("Make cards")
        .animation(.out(0.15), value: ready)
      }
    }
    .padding(.leading, 18).padding(.trailing, 12).padding(.top, 16).padding(.bottom, 12)
    .background(RoundedRectangle(cornerRadius: 24, style: .continuous).fill(t.surf))
    .contentShape(RoundedRectangle(cornerRadius: 24, style: .continuous))
    .onTapGesture { focused = true }
  }
  /// Return typed at the end makes the cards; a link or a long text pasted into an empty box opens its kind at once.
  private func typed(_ old: String, _ new: String) {
    if new == old + "\n" { text = old; go(old); return }
    let before = old.trimmingCharacters(in: .whitespacesAndNewlines)
    if before.isEmpty && new.utf16.count - old.utf16.count > 1 && StudyWords.kind(new) != "topic" { go(new) }
  }
  private func go(_ words: String) {
    guard words.trimmingCharacters(in: .whitespacesAndNewlines).count >= 2 else { return }
    focused = false; text = ""
    StudyWords.make(words, nav: nav, deckId: deckId, folder: folder)
  }
}

/// The Make box's row: Upload, Paste and YouTube open the Make flow on that kind; More is Lucida's own menu (the screen draws it, with
/// `MakeKinds.more`, anchored to the "more" button).
struct MakeKinds: View {
  @Environment(\.theme) private var t
  @EnvironmentObject private var nav: Nav
  var deckId = "", folder = ""
  @Binding var moreOpen: Bool
  var body: some View {
    HStack(spacing: 8) {
      tile("upload", "Upload") { nav.make(kind: "file", deckId: deckId, folder: folder) }
      tile("paste", "Paste") { nav.make(kind: "paste", deckId: deckId, folder: folder) }
      tile("youtube", "YouTube") { nav.make(kind: "video", deckId: deckId, folder: folder) }
      tile("chevDown", "More") { moreOpen.toggle() }.addMenuAnchor("more")
    }
  }
  private func tile(_ icon: String, _ label: String, _ action: @escaping () -> Void) -> some View {
    Button(action: action) {
      VStack(spacing: 5) {
        Icon(icon, 20, 2)
        Text(label).css(13, .semibold).lineLimit(1)
      }
      .foregroundStyle(t.text)
      .frame(maxWidth: .infinity).frame(height: 64)
      .overlay(RoundedRectangle(cornerRadius: 18, style: .continuous).strokeBorder(t.surf2, lineWidth: 1))
      .contentShape(RoundedRectangle(cornerRadius: 18, style: .continuous))
    }
    .buttonStyle(.press)
    .accessibilityLabel(label)
  }
  /// More's rows: the other kinds, Import cards, and (in the Library, not in a deck) New deck.
  @MainActor static func more(nav: Nav, deckId: String = "", folder: String = "") -> [AddMenuRow] {
    [AddMenuRow(icon: "image", title: "Photos", line: "") { nav.make(kind: "photo", deckId: deckId, folder: folder) },
     AddMenuRow(icon: "mic", title: "Record a lecture", line: "") { nav.make(kind: "record", deckId: deckId, folder: folder) },
     AddMenuRow(icon: "sparkle", title: "A topic", line: "") { nav.make(kind: "topic", deckId: deckId, folder: folder) },
     AddMenuRow(icon: "enter", title: "Import cards", line: "") { nav.importCards(deckId: deckId) }]
      + (deckId.isEmpty ? [AddMenuRow(icon: "decks", title: "New deck", line: "") { nav.newDeck() }] : [])
  }
}

/// What's due in your decks, in one line, and Review (the review of every deck). Only there when something is due.
struct DueLine: View {
  @Environment(\.theme) private var t
  @EnvironmentObject private var store: Store
  @EnvironmentObject private var nav: Nav
  var body: some View {
    let d = store.dueLine()
    if d.due > 0 {
      HStack(spacing: 12) {
        (Text(plural(d.due, "card") + " due").fontWeight(.semibold).foregroundColor(t.text) + Text(" · About \(max(1, d.minutes)) min").foregroundColor(t.muted))
          .css(15).lineLimit(1).frame(maxWidth: .infinity, alignment: .leading)
        Button { store.startReview(nil); nav.study(deckId: nil) } label: {
          Text("Review").css(15, .semibold).foregroundStyle(t.invText).padding(.horizontal, 18).frame(height: 40).background(Capsule().fill(t.inv))
        }
        .buttonStyle(.press)
      }
      .padding(.leading, 18).padding(.trailing, 10).frame(minHeight: 60)
      .background(RoundedRectangle(cornerRadius: 20, style: .continuous).fill(t.surf))
    }
  }
}

/// What your classes assigned (ASSIGNED_PHONE): a calm row each, soonest first: the deck, when it's due and whose class, and what's left for
/// you. A row opens the deck (or the class, until you study it). Only there when you have assignments.
struct AssignedList: View {
  @Environment(\.theme) private var t
  @EnvironmentObject private var store: Store
  @EnvironmentObject private var nav: Nav
  var body: some View {
    let rows = store.assignmentRows()
    if !rows.isEmpty {
      VStack(alignment: .leading, spacing: 0) {
        Eyebrow(text: "Assigned").padding(.horizontal, 4).padding(.top, 6).padding(.bottom, 4)
        ForEach(rows) { row($0) }
      }
    }
  }
  private func row(_ a: AssignmentRow) -> some View {
    let mesh = Mesh.gen(a.cover.seed ?? a.name, a.cover.style ?? "mix")
    let left = ClassWords.leftWord(goal: a.goal, cards: a.cards, a.progress)
    let sub = ClassWords.dueWord(a.goal, a.due, today: store.classToday) + " · " + a.className
    return Button {
      if let p = a.progress { nav.push(.deck(store.demo ? "cell" : p.deckId)) } else { nav.classPage(a.code) }
    } label: {
      HStack(spacing: 12) {
        CSSLinearGradient(angle: mesh.angle, stops: mesh.stops).frame(width: 10, height: 10).clipShape(Circle())
        VStack(alignment: .leading, spacing: 2) {
          Text(a.name).css(16, .medium).foregroundStyle(a.done ? t.muted : t.text).lineLimit(1).line(16)
          Text(sub).css(13).foregroundStyle(t.muted).lineLimit(1).line(13)
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        Text(left).css(14, .semibold).foregroundStyle(a.done ? t.good : t.text).lineLimit(1).fixedSize().line(14)
      }
      .frame(minHeight: 58)
      .overlay(alignment: .bottom) { Rectangle().fill(t.line).frame(height: 1).offset(y: 1) }
      .padding(.bottom, 1)
      .contentShape(Rectangle())
    }
    .buttonStyle(.plain)
    .accessibilityElement(children: .ignore)
    .accessibilityLabel([a.name, sub, left].joined(separator: ", "))
    .accessibilityAddTraits(.isButton)
  }
}

/// A brand-new account's other two ways in, under the Make box, side by side: Import cards and Connect AI.
struct StartTiles: View {
  @Environment(\.theme) private var t
  @EnvironmentObject private var nav: Nav
  var body: some View {
    HStack(spacing: 8) {
      tile("enter", "Import cards", "From Anki, Quizlet or a CSV") { nav.importCards() }
      tile("connect", "Connect AI", "Let Claude or ChatGPT make cards") { nav.openConnect() }
    }
  }
  private func tile(_ icon: String, _ title: String, _ line: String, action: @escaping () -> Void) -> some View {
    Button(action: action) {
      VStack(alignment: .leading, spacing: 6) {
        Icon(icon, 18, 2).frame(width: 36, height: 36).background(Circle().fill(t.bg))
        Spacer(minLength: 0)
        Text(title).css(16, .semibold)
        Text(line).css(13, lh: 1.4).foregroundStyle(t.muted).fixedSize(horizontal: false, vertical: true)
      }
      .foregroundStyle(t.text)
      .padding(18)
      .frame(maxWidth: .infinity, minHeight: 132, alignment: .leading)
      .background(RoundedRectangle(cornerRadius: 22, style: .continuous).fill(t.surf))
    }
    .buttonStyle(.press)
  }
}
