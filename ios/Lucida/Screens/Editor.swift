// iPhone · Card editor (PhoneEditor, PhoneEditorImage, PhoneEditorAudio, PhoneEditorRecording): a sheet over the deck.
// Four kinds of card (basic, fill in the blank, image, audio), tags, and a floating formatting bar over the keyboard,
// like Notion's. Card text is the same markdown the web app and AI apps write (see Rich.swift): the bar puts **bold**,
// [[blanks]], and the rest around what you select. An image card can hide parts of its picture behind boxes (each box
// is its own card); an audio card has a recording, an uploaded sound, or words read aloud, with its waveform.
import SwiftUI
import PhotosUI
import UniformTypeIdentifiers

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

/// A card as the editor holds it.
struct CardDraft {
  var kind = "basic", front = "", back = "", text = "", note = "", tags: [String] = []
  var image: String? = nil, audio: String? = nil, wave: Wave? = nil, speak = "", lang = "", auto = true, clozeMode = "each"
  /// A picture's boxes, what to hide, and (a saved box's card) its own box.
  var boxes: [OccBox] = [], occ = "one", box: String? = nil
}

extension Store {
  /// A card for the editor: the saved one, or a new one (the canvas's sample draft on design screens).
  func draft(_ cardId: String?, type: String) -> CardDraft {
    if let id = cardId, let c = lib.cards.first(where: { $0.id == id }) {
      return CardDraft(kind: c.kind, front: c.front, back: c.back, text: c.text, note: c.note, tags: c.tags, image: c.image, audio: c.audio, wave: c.wave,
                       speak: c.speak, lang: c.lang, auto: c.auto, clozeMode: c.cloze == -1 ? "one" : "each", boxes: c.boxes, occ: c.occ == "all" ? "all" : "one", box: c.box)
    }
    if demo {
      let tags = ["Energy", "Exam 1"]
      switch type {
      case "Blank": return CardDraft(kind: "cloze", text: "The [[mitochondrion]] is the powerhouse of the cell, making most of its [[ATP]].", note: "It makes most of the cell’s ATP.", tags: tags)
      case "Image": return CardDraft(kind: "image", front: "Name the part of the cell.", tags: tags, image: "mock", boxes: Sample.shared.BOXES, occ: "one", box: "b1")
      case "Audio": return CardDraft(kind: "audio", back: "電車 (でんしゃ): train", tags: tags, audio: "mock")
      default: return CardDraft(kind: "basic", front: "What does the electron transport chain pump across the inner membrane?", back: "Protons (H⁺), into the intermembrane space.", tags: tags)
      }
    }
    return CardDraft(kind: ["Blank": "cloze", "Image": "image", "Audio": "audio"][type] ?? "basic")
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
  /// Recording and playing (a clip starts, stops, or is saved).
  @ObservedObject private var sound = Sound.shared
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
  @State private var lang = ""
  @State private var tags: [String] = []
  @State private var image: String? = nil
  @State private var audio: String? = nil
  @State private var wave: Wave? = nil
  @State private var auto = true
  @State private var clozeMode = "each"
  /// Image occlusion: the boxes, what to hide, the picked box, and a drag on the picture under way.
  @State private var boxes: [OccBox] = []
  @State private var occ = "one"
  @State private var picked: String? = nil
  @State private var boxDrag = false
  @State private var picture: (path: String, image: UIImage)? = nil
  /// Sound: the words-read-aloud field open, and the file picker.
  @State private var speakOpen = false
  @State private var pickingSound = false
  @State private var loaded = false
  @State private var tagPicker = false
  @State private var styles = false
  @State private var photo: PhotosPickerItem? = nil
  @State private var picking = false
  @State private var sel: [Field: TextSelection] = [:]
  @State private var history: [(Field, String)] = []
  @FocusState private var focus: Field?
  /// The box whose answer is being typed.
  @FocusState private var labelFocus: String?

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
        // Switching away from Audio while it records throws the recording away.
        Segmented(options: [("Basic", "Basic"), ("Blank", "Blank"), ("Image", "Image"), ("Audio", "Audio")], current: type, height: 36, weight: .medium) { k in
          if k != "Audio" && store.isRecording { store.discardRecording() }
          type = k
        }
        ScrollViewReader { proxy in
          ScrollView(showsIndicators: false) {
            VStack(alignment: .leading, spacing: 16) {
              fields
              // The deck, then the tags as one group, which goes under the deck when it doesn't fit beside it.
              ChipThenGroup(gap: 6) {
                HStack(spacing: 6) { Icon("decks", 12, 2); Text(deck.name).css(13, .semibold) }
                  .padding(.horizontal, 12).frame(height: 32).background(Capsule().fill(t.surf))
                FlowLayout(spacing: 6, lineSpacing: 6) {
                ForEach(tags, id: \.self) { g in
                  let c = Tags.color(g)
                  Button { tags.removeAll { $0 == g } } label: {
                    HStack(spacing: 6) { Text(g).css(13, .semibold); Icon("close", 10, 2.4).opacity(0.7) }
                      .foregroundStyle(c.color).padding(.leading, 12).padding(.trailing, 10).frame(height: 32).background(Capsule().fill(c.opacity(0.149).color))
                  }
                  .buttonStyle(.press)
                }
                Button { focus = nil; labelFocus = nil; tagPicker = true } label: {
                  HStack(spacing: 6) { Icon("plus", 12, 2.4); Text("Add tag").css(13, .semibold) }
                    .foregroundStyle(t.muted).padding(.horizontal, 12).frame(height: 32)
                    .overlay(Capsule().strokeBorder(t.muted, style: StrokeStyle(lineWidth: 1.5, dash: [4, 3])))
                }
                .buttonStyle(.press)
                }
              }
              if cardId != nil {
                Button { Task { await store.deleteCard(cardId!); nav.close() } } label: { Text("Delete card").css(14, .semibold).foregroundStyle(t.again) }.buttonStyle(.plain)
              }
            }
            .padding(.bottom, keyboard.height > 0 ? keyboard.height + 60 : 0)
          }
          // A drag on the picture draws or moves a box instead of scrolling.
          .scrollDisabled(boxDrag)
          // What you type into stays in sight above the keyboard.
          .onChange(of: labelFocus) { _, id in
            guard let id else { return }
            if picked != id { picked = id }
            DispatchQueue.main.asyncAfter(deadline: .now() + 0.35) { withAnimation(.out(0.3)) { proxy.scrollTo("box-" + id, anchor: UnitPoint(x: 0.5, y: 0.3)) } }
          }
          .onChange(of: focus) { _, f in
            guard let f, type == "Image" || type == "Audio" else { return }
            DispatchQueue.main.asyncAfter(deadline: .now() + 0.35) { withAnimation(.out(0.3)) { proxy.scrollTo(f, anchor: UnitPoint(x: 0.5, y: 0.3)) } }
          }
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
    .fileImporter(isPresented: $pickingSound, allowedContentTypes: [.audio]) { r in
      guard case .success(let url) = r else { return }
      Task { if let clip = await store.pickSound(url) { audio = clip.url; wave = clip.wave } }
    }
    .onAppear(perform: load)
    // Leaving the editor while it records throws the recording away.
    .onDisappear { if store.isRecording { store.discardRecording() }; store.stopSound() }
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
    case "Image": imageFields
    case "Audio": audioFields
    default:
      field("Front", $front, .front, rows: 3, "The question")
      field("Back", $back, .back, rows: 2, "The answer")
    }
  }

  // ---------- image: the picture and its boxes ----------
  @ViewBuilder private var imageFields: some View {
    if let img = image {
      OccEditor(image: img, ui: picture?.path == img ? picture?.image : Pictures.cached(img), boxes: $boxes, picked: $picked, busy: $boxDrag)
        .task(id: img) { if let got = await Pictures.load(img) { picture = (img, got) } }
    } else {
      Button { picking = true } label: {
        VStack(spacing: 8) { Icon("image", 22, 1.8); Text("Add an image").css(14, .semibold) }.foregroundStyle(t.muted).frame(maxWidth: .infinity).frame(height: 240)
          .overlay(RoundedRectangle(cornerRadius: 20, style: .continuous).strokeBorder(t.muted, style: StrokeStyle(lineWidth: 1.5, dash: [4, 3])))
      }
      .buttonStyle(.plain)
    }
    FlowLayout(spacing: 8, lineSpacing: 8) {
      SmallButton(label: "Replace image", icon: "image") { picking = true }
      if image != nil && boxes.count < 30 { SmallButton(label: "Add a box", icon: "plus") { addBox() } }
      if !boxes.isEmpty { HideSegmented(current: occ) { occ = $0 } }
    }
    if !boxes.isEmpty {
      VStack(alignment: .leading, spacing: 8) {
        LabelText(text: answersHead)
        VStack(spacing: 6) { ForEach(Array(boxes.enumerated()), id: \.element.id) { i, b in answerRow(b, i) } }
      }
    } else if image != nil && image != "mock" {
      Text("Drag on the picture to hide a part behind a box. Each box becomes its own card, with what’s under it as the answer.")
        .css(13, lh: 1.45).foregroundStyle(t.muted)
    }
    field("Prompt", $front, .front, rows: 1, "What should they name?")
    // With boxes, each box's answer is its card's answer.
    if boxes.isEmpty { field("Answer", $back, .back, rows: 1) }
  }

  /// "Answers · Each box is its own card. …" (the second part in gray).
  private var answersHead: NSAttributedString {
    let para = NSMutableParagraphStyle(); para.minimumLineHeight = 13 * GEIST_LINE; para.maximumLineHeight = 13 * GEIST_LINE; para.lineBreakStrategy = []
    let s = NSMutableAttributedString(string: "Answers", attributes: [.font: Rich.geist(.semibold, 13), .foregroundColor: UIColor(t.text), .paragraphStyle: para])
    s.append(NSAttributedString(string: " · Each box is its own card. " + (occ == "all" ? "Every box stays hidden while one is asked." : "Only the box being asked is hidden."),
                                attributes: [.font: Rich.geist(.regular, 13), .foregroundColor: UIColor(t.muted), .paragraphStyle: para]))
    return s
  }

  /// One row per box: its number (tap to pick the box), what's under it (the card's answer), and × to take it away.
  private func answerRow(_ b: OccBox, _ i: Int) -> some View {
    let on = b.id == picked, n = i + 1
    return HStack(spacing: 8) {
      Button { picked = b.id } label: {
        Text("\(n)").css(12, .bold).foregroundStyle(on ? t.invText : t.text).frame(width: 24, height: 24)
          .background(RoundedRectangle(cornerRadius: 8, style: .continuous).fill(on ? t.inv : t.bg))
      }
      .buttonStyle(.flat)
      .accessibilityLabel("Pick box \(n)")
      .accessibilityAddTraits(on ? .isSelected : [])
      TextField("", text: Binding(get: { boxes.first { $0.id == b.id }?.label ?? "" },
                                  set: { v in if let k = boxes.firstIndex(where: { $0.id == b.id }) { boxes[k].label = String(v.prefix(200)) } }),
                prompt: Text("What’s under box \(n)").foregroundStyle(t.muted))
        .font(.geist(15)).foregroundStyle(t.text)
        .focused($labelFocus, equals: b.id)
        .submitLabel(i + 1 < boxes.count ? .next : .done)
        // Return goes on to the next box's answer.
        .onSubmit { labelFocus = i + 1 < boxes.count ? boxes[i + 1].id : nil }
        .autocorrectionDisabled()
        .accessibilityLabel("What’s under box \(n)")
      Button { removeBox(b.id) } label: { Icon("close", 12, 2.2).foregroundStyle(t.muted).frame(width: 28, height: 28).contentShape(Circle()) }
        .buttonStyle(.flat)
        .accessibilityLabel("Remove box \(n)")
    }
    .padding(.horizontal, 6)
    .frame(height: 34)
    .background(RoundedRectangle(cornerRadius: 14, style: .continuous).fill(t.surf))
    .overlay(RoundedRectangle(cornerRadius: 14, style: .continuous).strokeBorder(t.text, lineWidth: on ? 2 : 0))
    .animation(.easeOut(duration: 0.15), value: on)
    .id("box-" + b.id)
  }

  /// Add a box: in the middle, a little lower and to the right of any box already there.
  private func addBox() {
    guard image != nil, boxes.count < 30 else { return }
    let w = 0.26, h = 0.18
    var x = 0.37, y = 0.41
    while boxes.contains(where: { abs($0.x - x) < 0.02 && abs($0.y - y) < 0.02 }) && y < 0.78 { x = min(1 - w, x + 0.04); y += 0.04 }
    let id = "b" + String(Int(Date().timeIntervalSince1970 * 1000), radix: 36) + String(UUID().uuidString.prefix(4)).lowercased()
    boxes.append(OccBox(id: id, x: x, y: y, w: w, h: h))
    picked = id
  }
  private func removeBox(_ id: String) {
    if labelFocus == id { labelFocus = nil }
    boxes.removeAll { $0.id == id }
    if picked == id { picked = nil }
  }

  // ---------- audio: the sound ----------
  /// The sound as it plays: a file (and its waveform), or the words read aloud.
  private var clip: Clip? {
    if let a = audio, !a.isEmpty { return Clip(audio: a, wave: wave) }
    return Rich.plain(speak, join: " ", showMath: true).trimmingCharacters(in: .whitespacesAndNewlines).isEmpty ? nil : Clip(speak: speak, lang: lang)
  }

  @ViewBuilder private var audioFields: some View {
    let rec = store.isRecording, c = clip, vm = store.sound(c)
    // The sound: its player, or while recording the live waveform (the newest bar at the right), the time, and Stop.
    HStack(spacing: 14) {
      if rec {
        Button { store.toggleRecord { got in audio = got.url; wave = got.wave } } label: {
          RoundedRectangle(cornerRadius: 1.67, style: .continuous).fill(Color.white).frame(width: 7.33, height: 7.33)
            .frame(width: 40, height: 40).background(Circle().fill(store.recSaving ? t.muted : t.again))
        }
        .buttonStyle(.press)
        .disabled(store.recSaving)
        .accessibilityLabel(store.recSaving ? "Saving the recording" : "Stop recording")
        RecBars().frame(height: 32).frame(maxWidth: .infinity).clipped()
        RecTime()
      } else if let c {
        PlayButton(clip: c, vm: vm, size: 40, glyph: 16)
        WaveRow(clip: c, vm: vm, bars: 56, gap: 2).frame(height: 32)
        if vm.hasTime { ClipTime(vm: vm).css(12, mono: true).foregroundStyle(t.muted).frame(minWidth: 30, alignment: .trailing) }
      } else {
        Icon("play", 16).foregroundStyle(t.muted).frame(width: 40, height: 40).background(Circle().fill(t.surf2)).accessibilityHidden(true)
        Text("No sound yet. Record one, upload a file, or have it read aloud.").css(14).foregroundStyle(t.muted).lineLimit(1).frame(maxWidth: .infinity, alignment: .leading)
      }
    }
    .padding(.horizontal, 16).frame(height: 72)
    .background(RoundedRectangle(cornerRadius: 20, style: .continuous).fill(rec ? t.againTint : t.surf).animation(.easeOut(duration: 0.2), value: rec))
    FlowLayout(spacing: 8, lineSpacing: 8) {
      SmallButton(label: rec ? "Stop" : "Record", icon: "mic") { record() }
      SmallButton(label: "Upload", icon: "upload") { pickingSound = true }
      SmallButton(label: "Read it aloud", icon: "audio") { speakOpen.toggle() }
    }
    if speakOpen || !Rich.plain(speak).trimmingCharacters(in: .whitespacesAndNewlines).isEmpty {
      field("Words to read aloud", $speak, .speak, rows: 1, "What the card says out loud")
    }
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
  }

  /// Record, then Stop: the new clip (its link and its waveform) goes on the card.
  private func record() {
    focus = nil
    store.toggleRecord { got in audio = got.url; wave = got.wave }
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
        .accessibilityLabel(label)
    }
    .id(f)
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
          // Audio: switch to an audio card, or record when it is one.
          barButton("Record audio") { if type != "Audio" { type = "Audio" } else { record() } } label: { Icon("mic", 21, 1.6) }
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
    front = d.front; back = d.back; text = d.text; note = d.note; tags = d.tags; image = d.image; audio = d.audio; wave = d.wave; speak = d.speak; lang = d.lang
    auto = d.auto; clozeMode = d.clozeMode; boxes = d.boxes; occ = d.occ
    // A saved box's card opens with its box picked (the canvas shows box 1 picked).
    picked = d.box.flatMap { id in d.boxes.contains { $0.id == id } ? id : nil }
    history = []
    if store.demo && store.props.editorTyping { DispatchQueue.main.asyncAfter(deadline: .now() + 0.3) { focus = .front } }
  }

  private func save() {
    let kind = ["Blank": "cloze", "Image": "image", "Audio": "audio"][type] ?? "basic"
    let fr = Rich.plain(front).trimmingCharacters(in: .whitespacesAndNewlines), bk = Rich.plain(back).trimmingCharacters(in: .whitespacesAndNewlines)
    // What's missing, in the order you'd fill it in. A picture with boxes needs no Answer: each box's label is its card's.
    switch kind {
    case "basic": if fr.isEmpty { focus = .front; return }; if bk.isEmpty { focus = .back; return }
    case "cloze": if Rich.blanks(text).isEmpty { focus = .text; return }
    case "image": if image == nil { picking = true; return }; if boxes.isEmpty && bk.isEmpty { focus = .back; return }
    default:
      if clip == nil { speakOpen = true; DispatchQueue.main.async { focus = .speak }; return }
      if bk.isEmpty { focus = .back; return }
    }
    var o: [String: Any] = ["kind": kind, "front": front, "back": back, "text": text, "note": note, "tags": tags, "speak": speak, "auto": auto, "clozeMode": clozeMode]
    o["image"] = image ?? NSNull(); o["audio"] = audio ?? NSNull()
    o["wave"] = audio != nil ? (wave?.json ?? NSNull()) : NSNull()
    // A picture's boxes (as fractions) and what to hide: the server makes one card per box.
    if kind == "image" { o["boxes"] = boxes.map(\.json); o["occ"] = occ }
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

/// "What to hide": Hide one or Hide all, both as wide as the wider (a grid of equal columns on the canvas).
private struct HideSegmented: View {
  @Environment(\.theme) private var t
  let current: String
  let pick: (String) -> Void
  var body: some View {
    EqualWidths(gap: 4) {
      ForEach([("one", "Hide one"), ("all", "Hide all")], id: \.0) { id, label in
        let on = id == current
        Button { pick(id) } label: {
          Text(label).css(13, .semibold).lineLimit(1).foregroundStyle(on ? t.text : t.muted)
            .padding(.horizontal, 10).frame(maxWidth: .infinity).frame(height: 34)
            .background(Capsule().fill(on ? t.bg : .clear).shadow(color: .black.opacity(on ? 0.12 : 0), radius: 1.5, x: 0, y: 1))
            .contentShape(Capsule())
        }
        .buttonStyle(.plain)
        .accessibilityAddTraits(on ? .isSelected : [])
      }
    }
    .padding(4)
    .background(Capsule().fill(t.surf))
    .accessibilityElement(children: .contain)
    .accessibilityLabel("What to hide")
  }
}

/// A row whose items are all as wide as the widest one.
struct EqualWidths: Layout {
  var gap: CGFloat = 4
  func sizeThatFits(proposal: ProposedViewSize, subviews: Subviews, cache: inout ()) -> CGSize {
    let sizes = subviews.map { $0.sizeThatFits(.unspecified) }, w = sizes.map(\.width).max() ?? 0
    return CGSize(width: w * CGFloat(subviews.count) + gap * CGFloat(max(0, subviews.count - 1)), height: sizes.map(\.height).max() ?? 0)
  }
  func placeSubviews(in b: CGRect, proposal: ProposedViewSize, subviews: Subviews, cache: inout ()) {
    let w = (b.width - gap * CGFloat(max(0, subviews.count - 1))) / CGFloat(max(1, subviews.count))
    for (i, v) in subviews.enumerated() { v.place(at: CGPoint(x: b.minX + CGFloat(i) * (w + gap), y: b.minY), proposal: ProposedViewSize(width: w, height: b.height)) }
  }
}

/// A chip, then a group that wraps as one (a flex item holding a flex-wrap row): beside the chip when it fits, else on
/// its own lines under it.
struct ChipThenGroup: Layout {
  var gap: CGFloat = 6
  private func arrange(_ w: CGFloat?, _ subviews: Subviews) -> (chip: CGSize, group: CGSize, below: Bool) {
    guard subviews.count == 2 else { return (.zero, .zero, false) }
    let chip = subviews[0].sizeThatFits(.unspecified), ideal = subviews[1].sizeThatFits(.unspecified)
    guard let w, chip.width + gap + ideal.width > w else { return (chip, ideal, false) }
    return (chip, subviews[1].sizeThatFits(ProposedViewSize(width: w, height: nil)), true)
  }
  func sizeThatFits(proposal: ProposedViewSize, subviews: Subviews, cache: inout ()) -> CGSize {
    let a = arrange(proposal.width, subviews)
    return CGSize(width: proposal.width ?? a.chip.width + gap + a.group.width,
                  height: a.below ? a.chip.height + gap + a.group.height : max(a.chip.height, a.group.height))
  }
  func placeSubviews(in b: CGRect, proposal: ProposedViewSize, subviews: Subviews, cache: inout ()) {
    guard subviews.count == 2 else { return }
    let a = arrange(b.width, subviews), h = max(a.chip.height, a.group.height)
    subviews[0].place(at: CGPoint(x: b.minX, y: b.minY + (a.below ? 0 : (h - a.chip.height) / 2)), proposal: ProposedViewSize(a.chip))
    if a.below { subviews[1].place(at: CGPoint(x: b.minX, y: b.minY + a.chip.height + gap), proposal: ProposedViewSize(width: b.width, height: a.group.height)) }
    else { subviews[1].place(at: CGPoint(x: b.minX + a.chip.width + gap, y: b.minY + (h - a.group.height) / 2), proposal: ProposedViewSize(a.group)) }
  }
}
