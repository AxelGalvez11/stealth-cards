// iPhone · Card editor (PhoneEditor): a sheet over the deck. Four kinds of card (basic, fill in the blank, image, audio),
// tags, and a floating formatting bar over the keyboard, like Notion's. Card text is the same markdown the web app and
// AI apps write (see Rich.swift): the bar puts **bold**, [[blanks]], and the rest around what you select.
import SwiftUI
import PhotosUI

/// The keyboard's height, so the formatting bar can float just above it.
@MainActor
final class Keyboard: ObservableObject {
  @Published var height: CGFloat = 0
  private var tokens: [NSObjectProtocol] = []
  init() {
    let nc = NotificationCenter.default
    tokens.append(nc.addObserver(forName: UIResponder.keyboardWillChangeFrameNotification, object: nil, queue: .main) { [weak self] n in
      guard let f = (n.userInfo?[UIResponder.keyboardFrameEndUserInfoKey] as? NSValue)?.cgRectValue else { return }
      let h = max(0, UIScreen.main.bounds.height - f.minY)
      Task { @MainActor in withAnimation(.out(0.3)) { self?.height = h } }
    })
    tokens.append(nc.addObserver(forName: UIResponder.keyboardWillHideNotification, object: nil, queue: .main) { [weak self] _ in
      Task { @MainActor in withAnimation(.out(0.3)) { self?.height = 0 } }
    })
  }
}

extension Store {
  /// A card for the editor: the saved one, or a new one (the canvas's sample draft on design screens).
  func draft(_ cardId: String?, type: String) -> (kind: String, front: String, back: String, text: String, note: String, tags: [String], image: String?, audio: String?, speak: String, auto: Bool, clozeMode: String) {
    if let id = cardId, let c = lib.cards.first(where: { $0.id == id }) {
      return (c.kind, c.front, c.back, c.text, c.note, c.tags, c.image, c.audio, c.speak, c.auto, c.cloze == -1 ? "one" : "each")
    }
    if demo {
      switch type {
      case "Blank": return ("cloze", "", "", "The [[mitochondrion]] is the powerhouse of the cell, making most of its [[ATP]].", "It makes most of the cell’s ATP.", ["Energy", "Exam 1"], nil, nil, "", true, "each")
      case "Image": return ("image", "Name structure 1.", "Nucleus", "", "", ["Energy", "Exam 1"], "mock", nil, "", true, "each")
      case "Audio": return ("audio", "", "電車 (でんしゃ): train", "", "", ["Energy", "Exam 1"], nil, "mock", "", true, "each")
      default: return ("basic", "What does the electron transport chain pump across the inner membrane?", "Protons (H⁺), into the intermembrane space.", "", "", ["Energy", "Exam 1"], nil, nil, "", true, "each")
      }
    }
    return (["Blank": "cloze", "Image": "image", "Audio": "audio"][type] ?? "basic", "", "", "", "", [], nil, nil, "", true, "each")
  }

  func saveCard(_ cardId: String?, deckId: String, _ o: [String: Any]) async -> Bool {
    if demo { return true }
    if let id = cardId { var p = o; p["pending"] = false; await send("card.update", ["id": id, "patch": p]) }
    else { var p = o; p["deckId"] = deckId; await send("card.add", p) }
    return error == nil
  }
  func deleteCard(_ id: String) async { if !demo { await send("card.delete", ["id": id]) } }
}

struct EditorSheet: View {
  @Environment(\.theme) private var t
  @EnvironmentObject private var store: Store
  @EnvironmentObject private var nav: Nav
  @StateObject private var keyboard = Keyboard()
  let deckId: String?
  let cardId: String?
  init(deckId: String?, cardId: String?) { self.deckId = deckId; self.cardId = cardId }

  enum Field: Hashable { case front, back, text, note, speak }
  @State private var type = "Basic"
  @State private var front = ""
  @State private var back = ""
  @State private var text = ""
  @State private var note = ""
  @State private var speak = ""
  @State private var tags: [String] = []
  @State private var image: String? = nil
  @State private var audio: String? = nil
  @State private var auto = true
  @State private var clozeMode = "each"
  @State private var loaded = false
  @State private var tagPicker = false
  @State private var styles = false
  @State private var photo: PhotosPickerItem? = nil
  @State private var picking = false
  @State private var sel: [Field: TextSelection] = [:]
  @State private var history: [(Field, String)] = []
  @FocusState private var focus: Field?

  private var deck: DeckVM { store.deck(deckId ?? "") }

  var body: some View {
    ZStack(alignment: .bottom) {
      VStack(alignment: .leading, spacing: 16) {
        Grabber().frame(maxWidth: .infinity)
        HStack {
          Button(action: nav.close) { Text("Cancel").css(16).foregroundStyle(t.muted).frame(minHeight: 44) }.buttonStyle(.plain)
          Spacer()
          Text(cardId == nil ? "New card" : "Edit card").css(17, .semibold)
          Spacer()
          Button(action: save) { Text("Save").css(16, .semibold).foregroundStyle(t.text).frame(minHeight: 44) }.buttonStyle(.plain)
        }
        Segmented(options: [("Basic", "Basic"), ("Blank", "Blank"), ("Image", "Image"), ("Audio", "Audio")], current: type, height: 36, weight: .medium) { type = $0 }
        ScrollView(showsIndicators: false) {
          VStack(alignment: .leading, spacing: 16) {
            fields
            FlowLayout(spacing: 6, lineSpacing: 6) {
              HStack(spacing: 6) { Icon("decks", 12, 2); Text(deck.name).css(13, .semibold) }
                .padding(.horizontal, 12).frame(height: 32).background(Capsule().fill(t.surf))
              ForEach(tags, id: \.self) { g in
                let c = Tags.color(g)
                Button { tags.removeAll { $0 == g } } label: {
                  HStack(spacing: 6) { Text(g).css(13, .semibold); Icon("close", 10, 2.4).opacity(0.7) }
                    .foregroundStyle(c.color).padding(.leading, 12).padding(.trailing, 10).frame(height: 32).background(Capsule().fill(c.opacity(0.149).color))
                }
                .buttonStyle(.press)
              }
              Button { focus = nil; tagPicker = true } label: {
                HStack(spacing: 6) { Icon("plus", 12, 2.4); Text("Add tag").css(13, .semibold) }
                  .foregroundStyle(t.muted).padding(.horizontal, 12).frame(height: 32)
                  .overlay(Capsule().strokeBorder(t.muted, style: StrokeStyle(lineWidth: 1.5, dash: [4, 3])))
              }
              .buttonStyle(.press)
            }
            if cardId != nil {
              Button { Task { await store.deleteCard(cardId!); nav.close() } } label: { Text("Delete card").css(14, .semibold).foregroundStyle(t.again) }.buttonStyle(.plain)
            }
          }
          .padding(.bottom, keyboard.height > 0 ? keyboard.height + 60 : 0)
        }
      }
      .foregroundStyle(t.text)
      .padding(.top, 10).padding(.horizontal, 20).padding(.bottom, 34)
      if focus != nil && keyboard.height > 0 { formatBar.padding(.horizontal, 10).padding(.bottom, keyboard.height + 12) }
      if tagPicker {
        TagPicker(all: store.demo ? Array(Generated.tagColors.keys) : store.engine.tags, current: tags, set: { tags = $0 }, close: { tagPicker = false }).background(t.bg)
      }
    }
    .photosPicker(isPresented: $picking, selection: $photo, matching: .images)
    .onChange(of: photo) { _, item in upload(item) }
    .onAppear(perform: load)
  }

  // ---------- fields ----------
  @ViewBuilder private var fields: some View {
    switch type {
    case "Blank":
      field("Text", $text, .text, rows: 3, "Put [[double brackets]] around the words to hide")
      VStack(alignment: .leading, spacing: 8) {
        Text("Cards to make").css(13, .semibold)
        Segmented(options: [("each", "One card per blank · \(Rich.blanks(text).count)"), ("one", "One card, all blanks")], current: clozeMode, hPad: 10) { clozeMode = $0 }
      }
      field("Extra, shown after", $note, .note, rows: 1)
    case "Image":
      ZStack {
        RoundedRectangle(cornerRadius: 20, style: .continuous).fill(t.surf)
        if image == "mock" { CellDiagram().frame(width: 250, height: 170) }
        else if let img = image, let url = store.api.mediaURL(img) { AsyncImage(url: url) { $0.resizable().scaledToFit() } placeholder: { ProgressView() }.padding(8) }
        else {
          Button { picking = true } label: { VStack(spacing: 8) { Icon("image", 22, 1.8); Text("Add an image").css(14, .semibold) }.foregroundStyle(t.muted).frame(maxWidth: .infinity, maxHeight: .infinity) }
            .buttonStyle(.plain)
            .overlay(RoundedRectangle(cornerRadius: 20, style: .continuous).strokeBorder(t.muted, style: StrokeStyle(lineWidth: 1.5, dash: [4, 3])))
        }
      }
      .frame(height: 196)
      SmallButton(label: "Replace image", icon: "image") { picking = true }
      field("Prompt", $front, .front, rows: 1, "What should they name?")
      field("Answer", $back, .back, rows: 1)
    case "Audio":
      HStack(spacing: 14) {
        Button { store.play(CardFace(front: speak, audio: audio, speak: speak)) } label: {
          Icon("play", 16).foregroundStyle(t.invText).frame(width: 40, height: 40).background(Circle().fill(audio != nil || !speak.isEmpty ? t.inv : t.surf2))
        }
        .buttonStyle(.press).accessibilityLabel("Play")
        if audio == "mock" {
          HStack(spacing: 2) { ForEach(0..<64, id: \.self) { i in RoundedRectangle(cornerRadius: 1).fill(t.text).frame(height: Editor.wave[i]) } }.frame(height: 32)
          Text("0:02").css(12, mono: true).foregroundStyle(t.muted)
        } else {
          Text(audio != nil ? "Your recording" : !speak.isEmpty ? "Reads: “\(speak)”" : "No sound yet. Record one, upload a file, or have it read aloud.")
            .css(14).foregroundStyle(audio != nil || !speak.isEmpty ? t.text : t.muted).lineLimit(1).frame(maxWidth: .infinity, alignment: .leading)
        }
      }
      .padding(.horizontal, 16).frame(height: 72)
      .background(RoundedRectangle(cornerRadius: 20, style: .continuous).fill(t.surf))
      field("Words to read aloud", $speak, .speak, rows: 1, "What the card says out loud")
      field("Answer", $back, .back, rows: 1)
      HStack(spacing: 12) {
        VStack(alignment: .leading, spacing: 2) {
          Text("Play on its own").css(14, .semibold)
          Text("The sound starts when the card comes up").css(12).foregroundStyle(t.muted)
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        Toggle48(on: auto, label: "Play on its own") { auto.toggle() }
      }
      .frame(minHeight: 44)
    default:
      field("Front", $front, .front, rows: 3, "The question")
      field("Back", $back, .back, rows: 2, "The answer")
    }
  }

  /// A card field: gray, rounded, 15px text; a ring while you type in it.
  private func field(_ label: String, _ value: Binding<String>, _ f: Field, rows: Int, _ placeholder: String = "") -> some View {
    VStack(alignment: .leading, spacing: 8) {
      Text(label).css(13, .semibold)
      TextField("", text: Binding(get: { value.wrappedValue }, set: { v in history.append((f, value.wrappedValue)); value.wrappedValue = v }),
                selection: Binding(get: { sel[f] }, set: { sel[f] = $0 }), prompt: Text(placeholder).foregroundStyle(t.muted), axis: .vertical)
        .focused($focus, equals: f)
        .lineLimit(rows...10)
        .font(.geist(15)).lineSpacing(15 * 1.45 - 15 * GEIST_LINE).foregroundStyle(t.text)
        .padding(.horizontal, 16).padding(.vertical, 14)
        .frame(minHeight: (CGFloat(rows) * 15 * 1.45 + 28).rounded(), alignment: .topLeading)
        .background(RoundedRectangle(cornerRadius: 20, style: .continuous).fill(t.surf))
        .overlay(RoundedRectangle(cornerRadius: 20, style: .continuous).strokeBorder(t.text, lineWidth: focus == f ? 2 : 0))
    }
  }

  // ---------- the formatting bar ----------
  private var formatBar: some View {
    let bar = t.dark ? Color(hex: 0x2C2C2F) : .white, ink = t.dark ? Color(hex: 0xEBEBF0) : Color(hex: 0x3C3C43)
    return HStack(spacing: 4) {
      HStack(spacing: 0) {
        if styles {
          barButton("Back to tools") { styles = false } label: { Icon("back", 20, 1.8) }
          barButton("Bold") { wrap("**", "**") } label: { Text("B").font(.geist(18, .bold)) }
          barButton("Italic") { wrap("*", "*") } label: { Text("I").font(.custom("Georgia-Italic", fixedSize: 19)) }
          barButton("Underline") { wrap("<u>", "</u>") } label: { Text("U").font(.geist(18)).underline() }
          barButton("Strikethrough") { wrap("~~", "~~") } label: { Text("S").font(.geist(18)).strikethrough() }
          barButton("Highlight") { wrap("==", "==") } label: { Icon("marker", 21, 1.6) }
        } else {
          barButton("Text style") { styles = true } label: { Text("Aa").font(.geist(19, .medium)).tracking(-0.38) }
          barButton("Make a blank") { if type != "Blank" { type = "Blank" }; wrap("[[", "]]") } label: { Icon("bracket", 22, 1.6) }
          barButton("List") { listLine() } label: { Icon("list", 21, 1.6) }
          barButton("Add image") { type = "Image"; picking = true } label: { Icon("image", 21, 1.6) }
          barButton("Record audio") { type = "Audio" } label: { Icon("mic", 21, 1.6) }
          barButton("Math") { wrap("$", "$") } label: { Icon("sqrt", 21, 1.6) }
          barButton("Undo") { undo() } label: { Icon("undo", 21, 1.6) }
        }
      }
      .frame(maxWidth: .infinity)
      Rectangle().fill(ink.opacity(0.16)).frame(width: 1, height: 26)
      barButton("Hide keyboard") { focus = nil } label: { Icon("kbdDown", 22, 1.6) }
    }
    .foregroundStyle(ink)
    .padding(.horizontal, 6).frame(height: 48)
    .background(Capsule().fill(bar).shadow(color: .black.opacity(t.dark ? 0.5 : 0.1), radius: 14, y: 8))
    .overlay(Capsule().strokeBorder(t.dark ? Color.white.opacity(0.1) : Color.black.opacity(0.06), lineWidth: 0.5))
  }
  private func barButton<L: View>(_ label: String, action: @escaping () -> Void, @ViewBuilder label content: () -> L) -> some View {
    Button(action: action) { content().frame(width: 38, height: 38).contentShape(Circle()) }
      .buttonStyle(.plain).frame(maxWidth: .infinity).accessibilityLabel(label)
  }

  private func binding(_ f: Field) -> Binding<String> {
    switch f { case .front: return $front; case .back: return $back; case .text: return $text; case .note: return $note; case .speak: return $speak }
  }
  /// Puts markers around what you selected (or at the caret).
  private func wrap(_ open: String, _ close: String) {
    guard let f = focus else { return }
    let b = binding(f), s = b.wrappedValue
    var range = s.endIndex..<s.endIndex
    if case .selection(let r)? = sel[f]?.indices { range = r }
    history.append((f, s))
    let inner = String(s[range])
    b.wrappedValue = s.replacingCharacters(in: range, with: open + inner + close)
  }
  private func listLine() {
    guard let f = focus else { return }
    let b = binding(f)
    history.append((f, b.wrappedValue))
    var lines = b.wrappedValue.components(separatedBy: "\n")
    if let last = lines.indices.last { lines[last] = lines[last].hasPrefix("- ") ? String(lines[last].dropFirst(2)) : "- " + lines[last] }
    b.wrappedValue = lines.joined(separator: "\n")
  }
  private func undo() { guard let (f, v) = history.popLast() else { return }; binding(f).wrappedValue = v }

  // ---------- loading and saving ----------
  private func load() {
    guard !loaded else { return }
    loaded = true
    let d = store.draft(cardId, type: store.demo ? store.props.cardType : "Basic")
    type = ["cloze": "Blank", "image": "Image", "audio": "Audio"][d.kind] ?? "Basic"
    front = d.front; back = d.back; text = d.text; note = d.note; tags = d.tags; image = d.image; audio = d.audio; speak = d.speak; auto = d.auto; clozeMode = d.clozeMode
    history = []
    if store.demo && store.props.editorTyping { DispatchQueue.main.asyncAfter(deadline: .now() + 0.3) { focus = .front } }
  }

  private func save() {
    let kind = ["Blank": "cloze", "Image": "image", "Audio": "audio"][type] ?? "basic"
    let fr = Rich.plain(front).trimmingCharacters(in: .whitespacesAndNewlines), bk = Rich.plain(back).trimmingCharacters(in: .whitespacesAndNewlines)
    // What's missing, in the order you'd fill it in.
    switch kind {
    case "basic": if fr.isEmpty { focus = .front; return }; if bk.isEmpty { focus = .back; return }
    case "cloze": if Rich.blanks(text).isEmpty { focus = .text; return }
    case "image": if image == nil { picking = true; return }; if bk.isEmpty { focus = .back; return }
    default: if audio == nil && speak.trimmingCharacters(in: .whitespaces).isEmpty { focus = .speak; return }; if bk.isEmpty { focus = .back; return }
    }
    var o: [String: Any] = ["kind": kind, "front": front, "back": back, "text": text, "note": note, "tags": tags, "speak": speak, "auto": auto, "clozeMode": clozeMode]
    o["image"] = image ?? NSNull(); o["audio"] = audio ?? NSNull()
    Task { if await store.saveCard(cardId, deckId: deckId ?? "", o) { nav.close() } }
  }

  /// A picked photo goes to your library's storage; the card keeps its link.
  private func upload(_ item: PhotosPickerItem?) {
    guard let item, !store.demo else { return }
    Task {
      guard let data = try? await item.loadTransferable(type: Data.self), let img = UIImage(data: data), let jpg = img.jpegData(compressionQuality: 0.85) else { return }
      if let url = try? await store.api.upload(jpg, type: "image/jpeg") { image = url }
    }
  }
}

enum Editor {
  /// The canvas's small waveform (64 bars).
  static let wave: [CGFloat] = (0..<64).map { i in
    let x = Double(i) / 63, env = pow(sin(Double.pi * x), 0.6), v = 0.55 + 0.45 * sin(Double(i) * 1.7) * cos(Double(i) * 0.43 + 1.1)
    return CGFloat(max(3, (30 * env * v).rounded()))
  }
}
