// iPhone · Make cards (PhoneMake, and its Dark and Gray twins; `-board PhoneMake -state Review` shows any of the canvas's states; PhoneDeckMake is the
// same over a deck's page): a sheet over the page it came from, where cards are made from a file, pictures, a recording, pasted text, a YouTube link,
// or a topic. Pick a source, add it (with a few options under it), watch it work (and Cancel), check the new cards (edit, remove, or keep each one),
// and Add them to a deck, which then opens; opened from a deck's page (its + menu, its Sources' Make cards, More from a source) the cards go into that
// deck, Into deck starts on it, and closing or saving comes back to it (the owner, 2026-10-02: "pressing '+' should not take user back to the library
// page"). What it does is Data/MakeData.swift (web/make.js, ported); this file only draws it, like the board.
import SwiftUI
import PhotosUI
import AVFoundation
import UniformTypeIdentifiers

// ---------- the sheet's host ----------
/// The flow's sheet (`nav.make(...)`): the flow is made once, with the app around it, and opened where its start says.
struct MakeHost: View {
  @StateObject private var flow: MakeFlow
  init(start: MakeStart, store: Store, nav: Nav) { _flow = StateObject(wrappedValue: MakeFlow.opened(start, store: store, nav: nav)) }
  var body: some View {
    // (The X, a tap outside, and a pull down all end up in close(), which does nothing while it's making or recording.)
    SheetOverlay(top: 46, radius: 36, close: { flow.close() }) { MakeSheet(flow: flow) }
  }
}

extension MakeFlow {
  @MainActor static func opened(_ s: MakeStart, store: Store, nav: Nav) -> MakeFlow {
    let f = MakeFlow(env: MakeEnv(
      info: { store.demo ? .pro : store.lib.make },
      decks: {
        if store.demo { return store.libraryDecks().map { MakeDeckRef(id: $0.id, name: $0.name) } }
        return store.lib.decks.map { MakeDeckRef(id: $0.id, name: $0.name, readOnly: store.sharing($0).readOnly) }
      },
      materials: { store.lib.materials[$0] },
      reload: { if let next = try? await store.api.state() { store.accept(next) } },
      signedOut: { store.phase = .signedOut },
      leave: { id in
        guard !store.demo else { return }
        guard let id else { nav.close(); return }
        // Over a deck's page the cards are on it when the sheet goes, and no other tab or page opens; cards put into another deck open its page on top.
        if case .deck(let here)? = nav.path.last {
          if here == id { nav.close() } else { withAnimation(.out(0.3)) { nav.sheet = nil; nav.push(.deck(id)) } }
        } else { withAnimation(.out(0.3)) { nav.openDeck(id) } }
      },
      demo: store.demo))
    // (PhoneDeckMake: the canvas's states over Cell Biology's page, with Into deck on it.)
    if s.isDemo { MakeSample.apply(MakeSample.name(s.demo), to: f); if !s.deckId.isEmpty && f.m.opts.deckId.isEmpty { f.m.opts.deckId = s.deckId }; return f }
    f.enter(s)
    #if DEBUG
    f.debugFill(s)
    #endif
    return f
  }
}

#if DEBUG
extension MakeFlow {
  /// What the -make… launch arguments hand the flow, as if it had been picked or recorded: files, a stand-in microphone, a topic, text, a link.
  func debugFill(_ s: MakeStart) {
    if !s.recording.isEmpty { recorder.stand = URL(fileURLWithPath: s.recording); recorder.speed = s.speed }
    if !s.topic.isEmpty { setTopic(s.topic) }
    if !s.url.isEmpty {
      setUrl(s.url)
      if !s.text.isEmpty { useTranscript(true); setText(s.text) }
    } else if !s.text.isEmpty && m.text.isEmpty { setText(s.text) }
    if !s.files.isEmpty { Task { await addFiles(s.files.map { PickedFile(url: URL(fileURLWithPath: $0), name: ($0 as NSString).lastPathComponent) }) } }
  }
}
enum MakeDebug {
  /// `-makeFile <path>`, `-makePhoto <path>` (several: paths with commas between), `-makeRecording <path>` (a file for the microphone, which the
  /// simulator doesn't have; `-makeSpeed <n>` runs its clock n times faster), `-makeTopic <words>`, `-makeText <path>` (a text file's words),
  /// `-makeVideo <link>` (with -makeText: the link's transcript): open the flow with that already there. `-makeRoute "source=&deck=&from=&guide=&page="`
  /// opens it the way the web's /make link does (a deck's id, a kept source's id, a deck's Guide).
  static var start: MakeStart? {
    var s = MakeStart(), any = false
    if let v = Board.arg("-makeRoute") {
      var q: [String: String] = [:]
      for pair in v.split(separator: "&") { let kv = pair.split(separator: "=", maxSplits: 1); if kv.count == 2 { q[String(kv[0])] = String(kv[1]).removingPercentEncoding } }
      s.kind = q["source"] ?? ""; s.deckId = q["deck"] ?? ""; s.from = q["from"] ?? ""; s.guide = q["guide"] ?? ""; s.page = q["page"] ?? ""; any = true
    }
    func list(_ v: String) -> [String] { v.split(separator: ",").map(String.init) }
    if let v = Board.arg("-makeFile") { s.kind = "file"; s.files = list(v); any = true }
    if let v = Board.arg("-makePhoto") { s.kind = "photo"; s.files = list(v); any = true }
    if let v = Board.arg("-makeRecording") { s.kind = "record"; s.recording = v; any = true }
    if let v = Board.arg("-makeTopic") { s.kind = "topic"; s.topic = v; any = true }
    if let v = Board.arg("-makeText") { s.kind = "paste"; s.text = (try? String(contentsOfFile: v, encoding: .utf8)) ?? ""; any = true }
    if let v = Board.arg("-makeVideo") { s.kind = "video"; s.url = v; any = true }
    if let v = Board.arg("-makeSpeed"), let n = Double(v) { s.speed = n }
    return any ? s : nil
  }
}
#endif

// ---------- the sheet ----------
struct MakeSheet: View {
  @Environment(\.theme) private var t
  @EnvironmentObject private var store: Store
  @EnvironmentObject private var nav: Nav
  @ObservedObject var flow: MakeFlow
  @StateObject private var keyboard = Keyboard()
  @State private var choosing = false
  @State private var picking = false
  @State private var items: [PhotosPickerItem] = []
  @FocusState private var focus: Field?
  enum Field: Hashable { case topic, url, deck, text, transcript, question(String), answer(String) }

  private static let titles = ["file": "Upload", "photo": "Photos", "record": "Record a lecture", "paste": "Paste", "video": "YouTube", "topic": "A topic"]
  private static let topics = ["The Krebs cycle", "Spanish travel phrases", "The French Revolution", "Linear algebra basics"]
  private static let langs = [("", "Same as the material"), ("en", "English"), ("es", "Spanish"), ("fr", "French"), ("de", "German"), ("it", "Italian"), ("pt", "Portuguese"),
                              ("zh", "Chinese"), ("ja", "Japanese"), ("ko", "Korean"), ("ar", "Arabic"), ("hi", "Hindi")]

  private var info: MakeInfo { flow.env.info() }
  private var live: Bool { flow.m.rec == .recording || flow.m.rec == .paused }

  var body: some View {
    let m = flow.m
    VStack(spacing: 16) {
      header(m)
      ScrollViewReader { proxy in
        ScrollView(showsIndicators: false) {
          VStack(alignment: .leading, spacing: 16) { content(m) }
            .frame(maxWidth: .infinity, alignment: .leading)
        }
        .scrollDismissesKeyboard(.interactively)
        // A field that was tapped comes into view once the keyboard is up.
        .onChange(of: focus) { _, f in
          guard let f else { return }
          DispatchQueue.main.asyncAfter(deadline: .now() + 0.4) { withAnimation(.out(0.25)) { proxy.scrollTo(f, anchor: .center) } }
        }
      }
      footer(m)
    }
    .padding(.top, 16).padding(.horizontal, 20).padding(.bottom, keyboard.height > 0 ? keyboard.height + 12 : 30)
    .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .top)
    .foregroundStyle(t.text)
    // (The design screens' states that have something open over the step: the camera, and the list of languages.)
    .task {
      guard store.demo else { return }
      let state = MakeSample.name(Board.arg("-state"))
      try? await Task.sleep(nanoseconds: 700_000_000)
      if state == "Camera" { nav.openCamera { _ in } }
      if state == "Paste (language list)" { openLanguages(flow.m.opts.lang) }
    }
    // (Each picker is on a view of its own: several of them on one view can fight over the one place a presentation has.)
    .background(Color.clear.fileImporter(isPresented: $choosing, allowedContentTypes: Self.fileTypes, allowsMultipleSelection: true) { r in
      if case .success(let urls) = r { picked(urls) }
    })
    .background(Color.clear.photosPicker(isPresented: Binding(get: { picking && !store.demo }, set: { picking = $0 }), selection: $items,
                                         maxSelectionCount: max(1, info.photos - m.files.count), matching: .images))
    .onChange(of: items) { _, list in
      guard !list.isEmpty else { return }
      items = []
      Task { await pickedPhotos(list) }
    }
  }

  // ---------- the top ----------
  private func header(_ m: MakeState) -> some View {
    let title = m.step == "add" ? (m.from != nil ? "More cards" : Self.titles[m.kind] ?? "Make cards") : m.step == "making" ? "Making your cards" : m.step == "review" ? "Check your cards" : "Make cards"
    let canBack = (m.step == "add" && !live) || m.step == "error", canClose = m.step != "making" && !live
    return HStack(spacing: 10) {
      if canBack { MakeRound(icon: "back", size: 18, label: "Back") { flow.back() } }
      Text(title).css(22, .semibold, ls: -0.02).lineLimit(1).frame(maxWidth: .infinity, alignment: .leading).accessibilityAddTraits(.isHeader)
      if canClose { MakeRound(icon: "close", size: 16, label: "Close") { flow.close() } }
    }
    .frame(minHeight: 44)
  }

  @ViewBuilder private func content(_ m: MakeState) -> some View {
    switch m.step {
    case "pick": pick
    case "add": add(m)
    case "making": making(m)
    case "review": review(m)
    case "error": problem(m)
    default: EmptyView()
    }
  }

  // ---------- 1: what to make cards from ----------
  private var pick: some View {
    VStack(spacing: 10) {
      MakePickRow(icon: "upload", title: "Upload", line: "A PDF, slides, a Word file, captions, pictures or audio") { flow.choose("file") }
      MakePickRow(icon: "image", title: "Photo", line: "Notes, slides, a whiteboard or a book page") { flow.choose("photo") }
      MakePickRow(icon: "mic", title: "Record a lecture", line: "Use your microphone") { flow.choose("record") }
      MakePickRow(icon: "paste", title: "Paste", line: "Text or notes") { flow.choose("paste") }
      MakePickRow(icon: "youtube", title: "YouTube", line: "A public video") { flow.choose("video") }
      MakePickRow(icon: "sparkle", title: "A topic", line: "Say what you want to study") { flow.choose("topic") }
    }
  }

  // ---------- 2: the source, then the options ----------
  @ViewBuilder private func add(_ m: MakeState) -> some View {
    source(m)
    if !m.note.isEmpty { CSSText(m.note, 14, lh: 1.4, color: t.muted) }
    else if let e = m.error, e.soft { CSSText(e.message, 14, lh: 1.4, color: t.again) }
    options(m)
  }

  @ViewBuilder private func source(_ m: MakeState) -> some View {
    if let from = m.from {
      HStack(spacing: 12) {
        Icon("history", 17, 1.8).frame(width: 36, height: 36).background(Circle().fill(t.bg))
        VStack(alignment: .leading, spacing: 1) {
          Text(from.name).css(14, .semibold).lineLimit(1)
          Text("More cards from this source").css(12).foregroundStyle(t.muted)
        }
        .frame(maxWidth: .infinity, alignment: .leading)
      }
      .padding(.horizontal, 16).padding(.vertical, 10).frame(minHeight: 56)
      .background(RoundedRectangle(cornerRadius: 16, style: .continuous).fill(t.surf))
    } else {
      switch m.kind {
      case "file", "photo": drop(m); fileList(m)
      case "record": RecorderCard(flow: flow, recorder: flow.recorder, minutes: info.minutes)
      case "paste":
        MakeTextArea(text: Binding(get: { flow.m.text }, set: { flow.setText($0) }), placeholder: "Paste your text or notes", label: "Text to make cards from", rows: 7,
                     inset: UIEdgeInsets(top: 14, left: 16, bottom: 14, right: 16), lh: 1.5, radius: 20, fill: t.surf) { focus = .text }
          .id(Field.text)
      case "video": video(m)
      case "topic": topic(m)
      default: EmptyView()
      }
    }
  }

  /// The box with the button that picks files (or pictures, and a camera on a phone that has one): up to the plan's size.
  private func drop(_ m: MakeState) -> some View {
    let photo = m.kind == "photo", lim = info
    return VStack(spacing: 12) {
      Icon("upload", 26, 1.6).foregroundStyle(t.muted)
      Text(photo ? "Add your photos" : "Drop a file here").css(15, .semibold)
      GrowWrap(spacing: 8, lineSpacing: 8) {
        Button { guard m.note.isEmpty else { return }; if photo { picking = true } else { choosing = true } } label: { MakePill(label: photo ? "Choose photos" : "Choose a file", icon: "upload", inv: true, height: 40, hPad: 18, fill: true) }
          .buttonStyle(.press)
        if photo && (CameraSupport.available || store.demo) {
          Button { openCamera() } label: { MakePill(label: "Take a photo", icon: "image", height: 40, hPad: 18, bg: t.bg, fill: true) }
            .buttonStyle(.press)
        }
      }
      Text(photo ? "Up to \(lim.photos) pictures" : "PDF, slides, Word, captions, text, pictures or audio · up to \(lim.fileMB) MB").css(12).foregroundStyle(t.muted).multilineTextAlignment(.center)
    }
    .padding(.vertical, 20).padding(.horizontal, 20)
    .frame(maxWidth: .infinity)
    .background(RoundedRectangle(cornerRadius: 22, style: .continuous).fill(t.surf))
    .overlay(RoundedRectangle(cornerRadius: 22, style: .continuous).strokeBorder(t.line, lineWidth: 1.5))
  }

  @ViewBuilder private func fileList(_ m: MakeState) -> some View {
    if !m.files.isEmpty {
      VStack(spacing: 8) {
        ForEach(m.files) { f in
          HStack(spacing: 12) {
            Icon(f.fam == .doc ? "file" : f.fam == .image ? "image" : "audio", 17, 1.8).frame(width: 36, height: 36).background(Circle().fill(t.bg))
            VStack(alignment: .leading, spacing: 1) {
              Text(f.name).css(14, .semibold).lineLimit(1).truncationMode(.tail)
              Text(MakeFlow.sizeLine(f)).css(12).foregroundStyle(t.muted)
            }
            .frame(maxWidth: .infinity, alignment: .leading)
            Button { flow.removeFile(f.id) } label: { Icon("close", 14, 2).foregroundStyle(t.muted).frame(width: 32, height: 32).contentShape(Circle()) }
              .buttonStyle(.press).accessibilityLabel("Remove " + f.name)
          }
          .padding(.vertical, 8).padding(.leading, 12).padding(.trailing, 8).frame(minHeight: 56)
          .background(RoundedRectangle(cornerRadius: 16, style: .continuous).fill(t.surf))
          .accessibilityElement(children: .contain)
        }
      }
    }
  }

  private func video(_ m: MakeState) -> some View {
    let on = info.video, demo = store.demo, show = m.transcript || (!on && !demo)
    return VStack(alignment: .leading, spacing: 10) {
      MakeInput(text: Binding(get: { flow.m.url }, set: { flow.setUrl($0) }), placeholder: "youtube.com/watch?v=…", label: "Link to the video", height: 48, size: 16, url: true,
                focus: $focus, field: .url)
        .id(Field.url)
      CSSText(on ? "Lucida watches public videos, up to \(plural(info.minutes, "minute"))." : "Lucida can’t watch videos yet, so paste the transcript.", 13, lh: 1.45, color: t.muted)
      if show {
        VStack(alignment: .leading, spacing: 8) {
          MakeTextArea(text: Binding(get: { flow.m.text }, set: { flow.setText($0) }), placeholder: "Paste the transcript", label: "The video’s transcript", rows: 5,
                       inset: UIEdgeInsets(top: 14, left: 16, bottom: 14, right: 16), lh: 1.5, radius: 20, fill: t.surf) { focus = .transcript }
            .id(Field.transcript)
          CSSText("On YouTube, open the video’s description, tap Show transcript, then copy it.", 13, lh: 1.45, color: t.muted)
        }
      }
      // (When this server can't watch videos, the transcript is the only way, so there's nothing to switch to.)
      if on || demo {
        Button { flow.useTranscript(!m.transcript) } label: {
          Text(m.transcript ? "Use the link instead" : "Paste the transcript instead").css(14, .semibold).underline().foregroundStyle(t.text)
        }
        .buttonStyle(.plain)
      }
    }
  }

  private func topic(_ m: MakeState) -> some View {
    VStack(alignment: .leading, spacing: 12) {
      MakeInput(text: Binding(get: { flow.m.topic }, set: { flow.setTopic($0) }), placeholder: "I want to study…", label: "Topic", height: 52, size: 17, caps: .sentences, autocorrect: true,
                focus: $focus, field: .topic)
        .id(Field.topic)
      FlowLayout(spacing: 6, lineSpacing: 6) {
        ForEach(Self.topics, id: \.self) { x in
          Button { flow.setTopic(x) } label: {
            Text(x).css(13, .medium).foregroundStyle(t.text).padding(.horizontal, 14).frame(height: 32).background(Capsule().fill(t.surf))
          }
          .buttonStyle(.press)
        }
      }
    }
  }

  /// Into deck, How many cards, Kinds, and Language.
  private func options(_ m: MakeState) -> some View {
    let o = m.opts
    let all = flow.env.decks().filter { !$0.readOnly }
    let chosen = o.deckId.isEmpty ? nil : all.first { $0.id == o.deckId }
    // The first five decks (and the one that was picked, if it isn't one of them).
    var chips = Array(all.prefix(5))
    if let chosen, !chips.contains(where: { $0.id == chosen.id }) { chips.append(chosen) }
    return VStack(alignment: .leading, spacing: 16) {
      MakeLabeled("Into deck") {
        VStack(alignment: .leading, spacing: 8) {
          MakeInput(text: Binding(get: { flow.m.opts.deckName }, set: { v in flow.setOpt { $0.deckId = ""; $0.deckName = v } }),
                    placeholder: chosen != nil ? "" : (m.title.isEmpty ? (m.name.isEmpty ? "New deck name" : m.name) : m.title), label: "Deck name", height: 44, size: 15, caps: .words, autocorrect: true,
                    focus: $focus, field: .deck)
            .id(Field.deck)
          FlowLayout(spacing: 6, lineSpacing: 6) {
            ForEach(chips, id: \.id) { d in
              let on = o.deckId == d.id
              Button { flow.setOpt { $0.deckId = on ? "" : d.id; $0.deckName = "" } } label: {
                Text(d.name).css(13, .semibold).lineLimit(1).foregroundStyle(on ? t.invText : t.text).padding(.horizontal, 12).frame(height: 32).background(Capsule().fill(on ? t.inv : t.surf))
              }
              .buttonStyle(.press)
              .accessibilityLabel(d.name).accessibilityAddTraits(on ? .isSelected : [])
            }
          }
        }
      }
      MakeLabeled("How many cards") {
        Segmented(options: [("0", "Auto"), ("10", "10"), ("20", "20"), ("50", "50")], current: String(o.count), height: 36, size: 13, gap: 0, hPad: 6) { n in flow.setOpt { $0.count = Int(n) ?? 0 } }
      }
      MakeLabeled("Kinds") {
        VStack(alignment: .leading, spacing: 8) {
          FlowLayout(spacing: 8, lineSpacing: 8) {
            kindChip("Basic", on: o.basic) { flow.setOpt { $0.basic.toggle() } }
            kindChip("Fill in the blank", on: o.cloze) { flow.setOpt { $0.cloze.toggle() } }
            // Audio cards are for learning a language: the chip is there only once a language is set, and it starts off.
            if !o.lang.isEmpty { kindChip("Audio", on: o.audio) { flow.setOpt { $0.audio.toggle() } } }
            // Picture cards, from the diagrams found in the material: offered where there may be some (slides, a PDF, a Word file, pictures), and they start off.
            if flow.canImage { kindChip("Image", on: o.image) { flow.setOpt { $0.image.toggle() } } }
          }
          if o.audio && !o.lang.isEmpty {
            CSSText("Words and short phrases in \(Self.langs.first { $0.0 == o.lang }?.1 ?? "that language") are read aloud by your device’s voice. The back says what they mean.", 12, lh: 1.45, color: t.muted)
          }
          if o.image && flow.canImage {
            CSSText(m.from != nil ? "A card for each label of this source’s diagrams, with the label hidden." : "A card for each label of the diagrams in it, with the label hidden.", 12, lh: 1.45, color: t.muted)
          }
        }
      }
      MakeLabeled("Language") {
        // Lucida's own list, a sheet from the bottom (Design/PickSheet.swift), never the system's menu.
        Button { openLanguages(o.lang) } label: {
          HStack(spacing: 0) {
            Text(Self.langs.first { $0.0 == o.lang }?.1 ?? "Same as the material").css(13, .semibold).lineLimit(1).foregroundStyle(t.text)
            Spacer(minLength: 8)
            Icon("chevDown", 14, 2).foregroundStyle(t.muted)
          }
          .padding(.leading, 14).padding(.trailing, 12).frame(height: 36).frame(maxWidth: .infinity)
          .background(Capsule().fill(t.surf)).contentShape(Capsule())
        }
        .buttonStyle(.plain)
        .accessibilityLabel("Language of the cards")
        .accessibilityValue(Self.langs.first { $0.0 == o.lang }?.1 ?? "Same as the material")
      }
    }
  }

  /// The language of the cards: "Same as the material", then each language, in a list sheet over this one.
  private func openLanguages(_ current: String) {
    withAnimation(Motion.sheet) {
      nav.picker = PickRequest(title: "Language of the cards", rows: Self.langs.filter { !$0.0.isEmpty }.map { PickRow(id: $0.0, words: $0.1) }, value: current, any: "Same as the material",
                               choose: { row in flow.setOpt { $0.lang = row?.id ?? "" } })
    }
  }

  private func kindChip(_ label: String, on: Bool, _ action: @escaping () -> Void) -> some View {
    Button(action: action) {
      HStack(spacing: 6) { Icon("check", 13, 2.4); Text(label).css(13, .semibold) }
        .foregroundStyle(on ? t.invText : t.text).padding(.horizontal, 14).frame(height: 36).background(Capsule().fill(on ? t.inv : t.surf))
    }
    .buttonStyle(.press)
    .accessibilityLabel(label).accessibilityAddTraits(on ? .isSelected : [])
  }

  // ---------- 3: making ----------
  private func making(_ m: MakeState) -> some View {
    let p = m.progress, pct = p.n > 0 ? min(100, Int((100 * Double(p.i) / Double(p.n)).rounded())) : 0
    let line = p.phase == "write" || p.phase == "read" ? "\(plural(p.i, "part")) of \(p.n) done" : p.phase == "send" && p.n > 1 ? "\(p.i) of \(p.n) sent" : "This takes a moment"
    return VStack(alignment: .leading, spacing: 22) {
      VStack(alignment: .leading, spacing: 8) {
        Text(p.word.isEmpty ? "Getting ready…" : p.word).css(17, .semibold, ls: -0.01)
        Text(line).css(14).foregroundStyle(t.muted)
      }
      .accessibilityElement(children: .combine)
      MakeBar(pct: pct)
      if !m.limitNote.isEmpty { CSSText(m.limitNote, 14, lh: 1.4, color: t.again) }
    }
    .padding(.top, 18).padding(.bottom, 6)
  }

  // ---------- 4: checking the cards ----------
  private func review(_ m: MakeState) -> some View {
    let keep = flow.keptCount, from = m.name.isEmpty ? m.title : m.name
    return VStack(alignment: .leading, spacing: 16) {
      VStack(alignment: .leading, spacing: 14) {
        Text(plural(keep, "card") + (from.isEmpty ? "" : " from " + from)).css(14).foregroundStyle(t.muted)
        // The diagrams the make found go to the deck's Diagrams tab, whether or not their picture cards are kept.
        if m.figures > 0 {
          HStack(spacing: 8) {
            Icon("image", 15, 1.8).foregroundStyle(t.text)
            Text(plural(m.figures, "diagram") + " found. " + (m.figures == 1 ? "It is" : "They are") + " kept in the deck’s Diagrams tab.").css(13, lh: 1.4).foregroundStyle(t.muted)
          }
          .frame(maxWidth: .infinity, alignment: .leading).accessibilityElement(children: .combine)
        }
        notesPanel(m)
        CappedList(max: 520, show: m.editing) {
          VStack(spacing: 8) { ForEach(m.cards) { card($0, editing: m.editing == $0.key).id($0.key) } }
        }
      }
      if let e = m.error, e.soft { CSSText(e.message, 14, lh: 1.4, color: t.again) }
      if !m.limitNote.isEmpty { CSSText(m.limitNote, 14, lh: 1.4, color: t.again) }
    }
  }

  private func card(_ c: MakeCard, editing: Bool) -> some View {
    let cloze = c.kind == "cloze", audio = c.kind == "audio", picture = c.kind == "image"
    let q = cloze ? Rich.plain(c.text, cloze: true, blank: "____", join: " ", showMath: true) : audio ? c.speak : c.front
    // (A picture card says what is hidden in it: its labels, eight at most.)
    let a = cloze ? Rich.blanks(c.text, showMath: true).joined(separator: ", ") : picture ? MakeSheet.hidden(c.parts) : c.back
    // An audio card says it is read aloud, and in what language, before where it came from.
    let meta = [audio ? "Read aloud · " + c.lang : "", picture ? plural(c.parts.count, "card") + ", one for each label" : "", c.at].filter { !$0.isEmpty }.joined(separator: " · ")
    return HStack(alignment: .top, spacing: 8) {
      if picture { MakeThumb(card: c) }
      VStack(alignment: .leading, spacing: 6) {
        if !editing {
          HStack(alignment: .top, spacing: 8) {
            // The words, said by the device's own voice in their language.
            if audio {
              Button { MakeSpeech.shared.say(c.speak, lang: c.lang) } label: { Icon("audio", 14, 2).foregroundStyle(t.text).frame(width: 28, height: 28).background(Circle().fill(t.bg)).contentShape(Circle()) }
                .buttonStyle(.press).padding(.top, -3).accessibilityLabel("Hear " + c.speak)
            }
            CSSText(q, 15, .semibold, lh: 1.35, color: t.text, strike: c.gone)
          }
          CSSText(a, 14, lh: 1.4, color: t.muted)
        } else if audio {
          VStack(spacing: 6) {
            MakeInput(text: Binding(get: { c.speak }, set: { v in flow.edit(c.key) { $0.speak = v } }), placeholder: "", label: "Words to say", height: 40, size: 15, radius: 12, fill: t.bg,
                      focus: $focus, field: .question(c.key)).id(MakeSheet.Field.question(c.key))
            MakeInput(text: Binding(get: { c.back }, set: { v in flow.edit(c.key) { $0.back = v } }), placeholder: "", label: "What it means", height: 40, size: 15, radius: 12, fill: t.bg,
                      focus: $focus, field: .answer(c.key)).id(MakeSheet.Field.answer(c.key))
          }
        } else if !cloze {
          VStack(spacing: 6) {
            MakeInput(text: Binding(get: { c.front }, set: { v in flow.edit(c.key) { $0.front = v } }), placeholder: "", label: "Question", height: 40, size: 15, radius: 12, fill: t.bg,
                      focus: $focus, field: .question(c.key)).id(MakeSheet.Field.question(c.key))
            MakeInput(text: Binding(get: { c.back }, set: { v in flow.edit(c.key) { $0.back = v } }), placeholder: "", label: "Answer", height: 40, size: 15, radius: 12, fill: t.bg,
                      focus: $focus, field: .answer(c.key)).id(MakeSheet.Field.answer(c.key))
          }
        } else {
          MakeTextArea(text: Binding(get: { c.text }, set: { v in flow.edit(c.key) { $0.text = v } }), placeholder: "", label: "Sentence with a blank in [[double brackets]]", rows: 2,
                       inset: UIEdgeInsets(top: 10, left: 12, bottom: 10, right: 12), lh: 1.4, radius: 12, fill: t.bg) {}
        }
        if !meta.isEmpty { Text(meta).css(11, mono: true).foregroundStyle(t.muted).line(11) }
      }
      .frame(maxWidth: .infinity, alignment: .leading)
      HStack(spacing: 2) {
        // (A picture card is kept or left out as a whole: its boxes are moved in the card editor, once it is in the deck.)
        if !picture {
          Button { flow.openCard(c.key) } label: {
            (editing ? Icon("check", 16, 2.2) : Icon("pencil", 15, 2)).foregroundStyle(t.muted).frame(width: 36, height: 36).contentShape(Circle())
          }
          .buttonStyle(.press).accessibilityLabel(editing ? "Done editing" : "Edit this card")
        }
        Button { flow.remove(c.key, gone: !c.gone) } label: {
          (c.gone ? Icon("undo", 15, 2) : Icon("close", 15, 2)).foregroundStyle(t.muted).frame(width: 36, height: 36).contentShape(Circle())
        }
        .buttonStyle(.press).accessibilityLabel(c.gone ? "Put this card back" : "Remove this card")
      }
    }
    .padding(.vertical, 14).padding(.leading, 16).padding(.trailing, 8)
    .background(RoundedRectangle(cornerRadius: 20, style: .continuous).fill(t.surf))
    .opacity(c.gone ? 0.45 : 1)
    .accessibilityElement(children: .contain)
  }

  /// The starter notes drafted from the same material: how many and from where, the switch that keeps them with the cards, and the draft to read.
  /// When the deck they would go into has every page a Guide can have, the line says there is no room, and the switch is off and out of reach.
  @ViewBuilder private func notesPanel(_ m: MakeState) -> some View {
    if let n = m.notes {
      let full = flow.notesFull, keep = m.keepNotes && !full
      VStack(alignment: .leading, spacing: 10) {
        HStack(spacing: 12) {
          VStack(alignment: .leading, spacing: 2) {
            Text("Notes for the deck").css(15, .semibold)
            CSSText(full ? MakeFlow.noRoomForNotes : n.line(keep: keep), 13, lh: 1.4, color: t.muted)
          }
          .frame(maxWidth: .infinity, alignment: .leading)
          Toggle48(on: keep, enabled: !full, label: "Save these notes with the cards") { flow.setKeepNotes(!m.keepNotes) }
        }
        Button { flow.toggleNotesOpen() } label: { Text(m.notesOpen ? "Hide the notes" : "Read the notes").css(14, .semibold).underline().foregroundStyle(t.text) }
          .buttonStyle(.plain).accessibilityAddTraits(m.notesOpen ? .isSelected : [])
        if m.notesOpen {
          CappedList(max: 220) { MakeNotesPage(text: n.text) }.opacity(keep ? 1 : 0.5)
        }
      }
      .padding(.vertical, 14).padding(.horizontal, 16)
      .frame(maxWidth: .infinity, alignment: .leading)
      .background(RoundedRectangle(cornerRadius: 20, style: .continuous).fill(t.surf))
      .accessibilityElement(children: .contain).accessibilityLabel("Notes")
    }
  }

  // ---------- when it can't go on ----------
  private func problem(_ m: MakeState) -> some View {
    let e = m.error, hard = e.flatMap { $0.soft ? nil : $0.message } ?? ""
    let more = e?.code == "video-failed" ? "You can paste the video’s transcript instead." : e?.code == "video-off" ? "On YouTube, open the video’s description, tap Show transcript, then copy it." : ""
    return VStack(alignment: .leading, spacing: 14) {
      CSSText(hard, 17, .semibold, lh: 1.35, color: t.text)
      if !more.isEmpty { CSSText(more, 14, lh: 1.45, color: t.muted) }
    }
    .padding(.top, 8)
  }

  // ---------- the buttons at the bottom ----------
  @ViewBuilder private func footer(_ m: MakeState) -> some View {
    switch m.step {
    case "add" where !live:
      PairRow(spacing: 10) {
        FooterButton(label: "Back") { flow.back() }
        if m.kind != "record" {
          FooterButton(label: "Make cards", icon: "sparkle", on: flow.ready) { flow.make() }
        }
      }
    case "making": FooterButton(label: "Cancel") { flow.cancel() }
    case "review":
      let keep = flow.keptCount
      PairRow(spacing: 10, secondBasis: 40) {
        FooterButton(label: "Discard") { flow.discard() }
        FooterButton(label: m.saving ? "Saving…" : keep > 0 ? "Add \(plural(keep, "card")) to \(flow.into)" : "No cards to add", on: keep > 0) { flow.save() }
      }
    case "error":
      PairRow(spacing: 10) {
        FooterButton(label: "Back") { flow.back() }
        if m.error?.pro == true { FooterButton(label: "Go Pro", on: true, hPad: 0) { nav.goPro() } }
        else if m.error?.again == true { FooterButton(label: "Try again", on: true) { flow.retry() } }
      }
    default: EmptyView()
    }
  }

  // ---------- picking ----------
  /// What the file picker offers: a PDF, slides, a Word file, text, caption files (.srt and .vtt), pictures, and audio.
  static let fileTypes: [UTType] = [.pdf, .plainText, .image, .audio] + ["pptx", "docx", "md", "srt", "vtt"].compactMap { UTType(filenameExtension: $0) }
  private func picked(_ urls: [URL]) {
    Task {
      var list: [PickedFile] = []
      for u in urls {
        let open = u.startAccessingSecurityScopedResource()
        defer { if open { u.stopAccessingSecurityScopedResource() } }
        // A copy of its own: the picker's file goes away when it lets go, and a picture or sound is read later.
        let to = flow.scratch(u.lastPathComponent)
        if (try? FileManager.default.copyItem(at: u, to: to)) != nil {
          list.append(PickedFile(url: to, name: u.lastPathComponent, type: MakeFlow.mime(u.pathExtension)))
        }
      }
      await flow.addFiles(list)
    }
  }
  private func pickedPhotos(_ list: [PhotosPickerItem]) async {
    var out: [PickedFile] = []
    for item in list {
      if let p = try? await item.loadTransferable(type: PickedImage.self) { out.append(PickedFile(url: p.url, name: p.name, type: "image/jpeg")) }
      else if let data = try? await item.loadTransferable(type: Data.self) {
        let to = flow.scratch("Photo \(flow.m.files.count + out.count + 1).jpg")
        if (try? data.write(to: to)) != nil { out.append(PickedFile(url: to, name: to.lastPathComponent, type: "image/jpeg")) }
      }
    }
    await flow.addFiles(out)
  }
  /// Take a photo: Lucida's own camera over everything; the picture it gives comes back as a file to make cards from.
  private func openCamera() {
    nav.openCamera { image in
      guard let image, let data = image.jpegData(compressionQuality: 0.9) else { return }
      Task { await pickedCamera(data) }
    }
  }
  private func pickedCamera(_ data: Data) async {
    let to = flow.scratch("Photo \(flow.m.files.count + 1).jpg")
    guard (try? data.write(to: to)) != nil else { return }
    await flow.addFiles([PickedFile(url: to, name: to.lastPathComponent, type: "image/jpeg")])
  }
}

// ---------- pieces ----------
/// ROUND: a 40-point gray circle with an icon (Back, the X).
private struct MakeRound: View {
  @Environment(\.theme) private var t
  let icon: String, size: CGFloat, label: String
  let action: () -> Void
  var body: some View {
    Button(action: action) { Icon(icon, size, 2).foregroundStyle(t.text).frame(width: 40, height: 40).background(Circle().fill(t.surf)) }
      .buttonStyle(.press).accessibilityLabel(label)
  }
}

/// A way to start: a round icon, its name and a line about it, and an arrow.
private struct MakePickRow: View {
  @Environment(\.theme) private var t
  let icon: String, title: String, line: String
  let action: () -> Void
  var body: some View {
    Button(action: action) {
      HStack(spacing: 14) {
        Icon(icon, 20, 1.8).foregroundStyle(t.text).frame(width: 44, height: 44).background(Circle().fill(t.bg))
        VStack(alignment: .leading, spacing: 2) {
          Text(title).css(16, .semibold, ls: -0.01).foregroundStyle(t.text)
          CSSText(line, 13, color: t.muted)
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        Icon("chev", 16, 2).foregroundStyle(t.muted)
      }
      .padding(.vertical, 12).padding(.leading, 12).padding(.trailing, 16)
      .frame(maxWidth: .infinity, minHeight: 68, alignment: .leading)
      .background(RoundedRectangle(cornerRadius: 20, style: .continuous).fill(t.surf))
    }
    .buttonStyle(.press)
    .accessibilityLabel(title).accessibilityHint(line)
  }
}

/// A pill (the board's btn): words and maybe an icon, `height` tall, black when `inv`.
struct MakePill: View {
  @Environment(\.theme) private var t
  let label: String
  var icon: String? = nil
  var inv = false
  var height: CGFloat = 52
  var hPad: CGFloat = 20
  var bg: Color? = nil
  /// As wide as the room it's given (a button that grows to fill its line).
  var fill = false
  var body: some View {
    HStack(spacing: 8) {
      if let icon { Icon(icon, 16, 2) }
      Text(label).css(15, .semibold).lineLimit(1)
    }
    .foregroundStyle(inv ? t.invText : t.text)
    .padding(.horizontal, hPad).frame(maxWidth: fill ? .infinity : nil).frame(height: height)
    .background(Capsule().fill(bg ?? (inv ? t.inv : t.surf)))
  }
}

/// A footer button: gray, or black (and not faded) when it can be pressed (`on`); long words end in … (`.lineLimit(1)`) instead of wrapping.
private struct FooterButton: View {
  @Environment(\.theme) private var t
  let label: String
  var icon: String? = nil
  var on: Bool? = nil
  /// The room on each side of the words (the Go Pro link has none).
  var hPad: CGFloat = 20
  let action: () -> Void
  var body: some View {
    let black = on != nil, lit = on ?? false
    Button(action: action) {
      HStack(spacing: 8) {
        if let icon { Icon(icon, 16, 2) }
        Text(label).css(15, .semibold).lineLimit(1).truncationMode(.tail)
      }
      .foregroundStyle(black ? (lit ? t.invText : t.muted) : t.text)
      .padding(.horizontal, hPad).frame(maxWidth: .infinity).frame(height: 52)
      .background(Capsule().fill(black ? (lit ? t.inv : t.surf2) : t.surf))
      .contentShape(Capsule())
    }
    .buttonStyle(.press)
    .accessibilityLabel(label)
  }
}

/// The footer's buttons, like the board's flex row (the first grows 1, the second 2): each starts at its own width and the room left is shared
/// 1 to 2. The review's second button is `flex: 2 1 0`: it starts at no width (only its padding, `secondBasis`), so the room is shared from there
/// and its words end in … if they don't fit. One button fills the row.
private struct PairRow: Layout {
  var spacing: CGFloat = 10
  var secondBasis: CGFloat? = nil
  private func widths(_ W: CGFloat, _ v: Subviews) -> [CGFloat] {
    if v.count == 1 { return [W] }
    guard v.count == 2 else { return v.map { _ in W } }
    let a = v[0].sizeThatFits(.unspecified).width, b = secondBasis ?? v[1].sizeThatFits(.unspecified).width, free = W - a - b - spacing
    return free >= 0 ? [a + free / 3, b + free * 2 / 3] : [a, W - a - spacing]
  }
  func sizeThatFits(proposal: ProposedViewSize, subviews: Subviews, cache: inout ()) -> CGSize {
    let W = proposal.width ?? 390, w = widths(W, subviews)
    return CGSize(width: W, height: zip(subviews, w).map { $0.sizeThatFits(ProposedViewSize(width: $1, height: nil)).height }.max() ?? 0)
  }
  func placeSubviews(in bounds: CGRect, proposal: ProposedViewSize, subviews: Subviews, cache: inout ()) {
    var x = bounds.minX
    for (v, w) in zip(subviews, widths(bounds.width, subviews)) {
      v.place(at: CGPoint(x: x, y: bounds.minY), anchor: .topLeading, proposal: ProposedViewSize(width: w, height: bounds.height))
      x += w + spacing
    }
  }
}

/// Buttons that wrap like CSS flex-wrap, each growing to fill its line (flex-grow: 1): on a phone wide enough two sit side by side, on a
/// narrower one they stack, each as wide as the box. The row is as wide as its buttons want (up to the room there is), so one button
/// stays itself.
private struct GrowWrap: Layout {
  var spacing: CGFloat = 8, lineSpacing: CGFloat = 8
  private func lines(_ W: CGFloat, _ sizes: [CGSize]) -> [[Int]] {
    var out: [[Int]] = [], cur: [Int] = [], used: CGFloat = 0
    for (i, s) in sizes.enumerated() {
      if !cur.isEmpty && used + spacing + s.width > W { out.append(cur); cur = []; used = 0 }
      used += (cur.isEmpty ? 0 : spacing) + s.width; cur.append(i)
    }
    if !cur.isEmpty { out.append(cur) }
    return out
  }
  private func fit(_ proposal: ProposedViewSize, _ v: Subviews) -> (width: CGFloat, sizes: [CGSize], lines: [[Int]]) {
    let sizes = v.map { $0.sizeThatFits(.unspecified) }
    let all = sizes.reduce(0) { $0 + $1.width } + spacing * CGFloat(max(0, sizes.count - 1)), W = min(proposal.width ?? all, all)
    return (W, sizes, lines(W, sizes))
  }
  func sizeThatFits(proposal: ProposedViewSize, subviews: Subviews, cache: inout ()) -> CGSize {
    let f = fit(proposal, subviews)
    return CGSize(width: f.width, height: f.lines.reduce(0) { $0 + ($1.map { f.sizes[$0].height }.max() ?? 0) } + lineSpacing * CGFloat(max(0, f.lines.count - 1)))
  }
  func placeSubviews(in bounds: CGRect, proposal: ProposedViewSize, subviews: Subviews, cache: inout ()) {
    let f = fit(ProposedViewSize(width: bounds.width, height: nil), subviews)
    var y = bounds.minY
    for line in f.lines {
      let natural = line.reduce(0) { $0 + f.sizes[$1].width } + spacing * CGFloat(line.count - 1), extra = max(0, bounds.width - natural) / CGFloat(line.count)
      let h = line.map { f.sizes[$0].height }.max() ?? 0
      var x = bounds.minX
      for i in line {
        let w = f.sizes[i].width + extra
        subviews[i].place(at: CGPoint(x: x, y: y), anchor: .topLeading, proposal: ProposedViewSize(width: w, height: h))
        x += w + spacing
      }
      y += h + lineSpacing
    }
  }
}

/// A scroller as tall as what's in it, up to `max` (the review's list). One scroller whatever its height, so a card being edited keeps its
/// keyboard when the list grows past the top.
private struct CappedListHeight: PreferenceKey { static let defaultValue: CGFloat = 0; static func reduce(value: inout CGFloat, nextValue: () -> CGFloat) { value = nextValue() } }
private struct CappedList<Content: View>: View {
  let max: CGFloat
  /// A row to bring into view whenever it changes (its id): the card opened for editing, whose fields would otherwise be
  /// out of sight below the list's edge, where a tap can't reach them.
  var show = ""
  @ViewBuilder var content: Content
  @State private var height: CGFloat = 0
  var body: some View {
    ScrollViewReader { proxy in
      ScrollView(showsIndicators: false) {
        content.background(GeometryReader { g in Color.clear.preference(key: CappedListHeight.self, value: g.size.height) })
      }
      .frame(height: height > 0 ? Swift.min(height, max) : max)
      .onPreferenceChange(CappedListHeight.self) { height = $0 }
      .onChange(of: show) { _, id in
        guard !id.isEmpty else { return }
        // (Once the card has opened into its fields.)
        DispatchQueue.main.async { withAnimation(.out(0.25)) { proxy.scrollTo(id, anchor: .center) } }
      }
    }
  }
}

/// A label over a field or a row of choices.
private struct MakeLabeled<Body: View>: View {
  let label: String
  @ViewBuilder var content: Body
  init(_ label: String, @ViewBuilder content: () -> Body) { self.label = label; self.content = content() }
  var body: some View {
    VStack(alignment: .leading, spacing: 8) {
      Text(label).css(13, .semibold)
      content
    }
  }
}

/// The making page's bar: a gray track and a black fill, at least a little of it showing.
private struct MakeBar: View {
  @Environment(\.theme) private var t
  @Environment(\.accessibilityReduceMotion) private var still
  let pct: Int
  var body: some View {
    GeometryReader { g in
      ZStack(alignment: .leading) {
        Capsule().fill(t.surf2)
        Capsule().fill(t.inv).frame(width: g.size.width * CGFloat(max(4, pct)) / 100)
      }
    }
    .frame(height: 6)
    .animation(still ? nil : .easeInOut(duration: 0.5), value: pct)
    .accessibilityElement().accessibilityLabel("Progress").accessibilityValue("\(pct) percent")
  }
}

/// The starter notes, read as the Notes page will show them (web/notes.js's reading view, Design/NotesViews.swift): a section for each part, each note a toggle
/// that opens here too (nothing about them is remembered: they aren't the deck's yet).
private struct MakeNotesPage: View {
  @Environment(\.theme) private var t
  let text: String
  @StateObject private var notes = NotesPage()
  @State private var hooks = NotesHooks()
  var body: some View {
    NotesView(page: notes, setup: NotesSetup(colors: NotesColors(t, code: t.bg), hooks: hooks))
      .padding(.leading, 22)
      .onAppear { notes.load(text, key: "", editable: false, blank: false) }
      .onChange(of: text) { _, v in notes.load(v, key: "", editable: false, blank: false) }
  }
}

/// A one-line field like the board's: gray, rounded, the page's own hint color. The whole gray box is the field, as an input is on the web:
/// the words' own area ends where its padding begins, so the padding on each side is a tap area that focuses the field too (a tap there would
/// otherwise go to whatever button is nearby: beside a card's question, that is the one that closes the editor).
private struct MakeInput: View {
  @Environment(\.theme) private var t
  @Binding var text: String
  let placeholder: String, label: String
  var height: CGFloat = 48, size: CGFloat = 16, radius: CGFloat = 16
  var fill: Color? = nil
  var url = false
  var caps: TextInputAutocapitalization = .never
  var autocorrect = false
  let focus: FocusState<MakeSheet.Field?>.Binding
  let field: MakeSheet.Field
  private var pad: CGFloat { radius == 12 ? 12 : 16 }
  var body: some View {
    TextField("", text: $text, prompt: Text(placeholder).foregroundStyle(PLACEHOLDER))
      .font(.geist(size)).foregroundStyle(t.text).tint(t.text)
      .textInputAutocapitalization(caps).autocorrectionDisabled(url || !autocorrect)
      .keyboardType(url ? .URL : .default).submitLabel(.done)
      .focused(focus, equals: field)
      .padding(.horizontal, pad).frame(height: height)
      .background(RoundedRectangle(cornerRadius: radius, style: .continuous).fill(fill ?? t.surf))
      .overlay(alignment: .leading) { gutter }
      .overlay(alignment: .trailing) { gutter }
      .accessibilityLabel(label)
  }
  private var gutter: some View {
    Color.clear.frame(width: pad).contentShape(Rectangle()).onTapGesture { focus.wrappedValue = field }.accessibilityHidden(true)
  }
}

/// A box for many lines, like the board's textarea: a fixed height of `rows` lines, its own scrolling, the words at a CSS line height.
struct MakeTextArea: View {
  @Environment(\.theme) private var t
  @Binding var text: String
  let placeholder: String, label: String
  var rows = 5
  var inset = UIEdgeInsets(top: 14, left: 16, bottom: 14, right: 16)
  var lh: CGFloat = 1.5
  var radius: CGFloat = 20
  var fill: Color
  var began: () -> Void = {}
  var body: some View {
    let line = 15 * lh, height = CGFloat(rows) * line + inset.top + inset.bottom
    TextAreaView(text: $text, label: label, inset: inset, line: line, color: UIColor(t.text), began: began)
      .frame(height: height)
      .background(RoundedRectangle(cornerRadius: radius, style: .continuous).fill(fill))
      .overlay(alignment: .topLeading) {
        if text.isEmpty && !placeholder.isEmpty {
          Text(placeholder).font(.geist(15)).foregroundStyle(PLACEHOLDER).padding(.top, inset.top + (line - 15 * GEIST_LINE) / 2).padding(.leading, inset.left)
            .allowsHitTesting(false).accessibilityHidden(true)
        }
      }
  }
}
private struct TextAreaView: UIViewRepresentable {
  @Binding var text: String
  let label: String
  let inset: UIEdgeInsets
  let line: CGFloat
  let color: UIColor
  let began: () -> Void
  private var attrs: [NSAttributedString.Key: Any] {
    let para = NSMutableParagraphStyle(); para.minimumLineHeight = line; para.maximumLineHeight = line; para.lineBreakStrategy = []
    return [.font: Rich.geist(.regular, 15), .foregroundColor: color, .paragraphStyle: para, .baselineOffset: (line - 15 * GEIST_LINE) / 2]
  }
  func makeUIView(context: Context) -> UITextView {
    // (The older text engine: the newer one doesn't keep every line at the height set for it, and the lines must sit as the browser's do.)
    let v = UITextView(usingTextLayoutManager: false)
    v.backgroundColor = .clear; v.textContainerInset = inset; v.textContainer.lineFragmentPadding = 0
    v.showsVerticalScrollIndicator = false; v.delegate = context.coordinator; v.autocapitalizationType = .sentences
    v.accessibilityLabel = label; v.tintColor = color
    v.typingAttributes = attrs; v.attributedText = NSAttributedString(string: text, attributes: attrs)
    return v
  }
  func updateUIView(_ v: UITextView, context: Context) {
    context.coordinator.parent = self
    if v.text != text { v.attributedText = NSAttributedString(string: text, attributes: attrs) }
    v.typingAttributes = attrs; v.tintColor = color
    if v.textColor != color { v.textColor = color }
  }
  func makeCoordinator() -> Coordinator { Coordinator(self) }
  final class Coordinator: NSObject, UITextViewDelegate {
    var parent: TextAreaView
    init(_ p: TextAreaView) { parent = p }
    func textViewDidChange(_ v: UITextView) { if parent.text != v.text { parent.text = v.text } }
    func textViewDidBeginEditing(_ v: UITextView) { parent.began() }
  }
}

// ---------- the recorder ----------
/// Record a lecture: the state in words, the time, a quiet meter, and the buttons; then where the audio goes.
private struct RecorderCard: View {
  @Environment(\.theme) private var t
  @ObservedObject var flow: MakeFlow
  @ObservedObject var recorder: MakeRecorder
  let minutes: Int
  private func clock(_ s: Double) -> String {
    let n = max(0, Int(s)), h = n / 3600, m = n % 3600 / 60
    return (h > 0 ? "\(h):" + String(format: "%02d", m) : "\(m)") + ":" + String(format: "%02d", n % 60)
  }
  var body: some View {
    let live = recorder.live, paused = recorder.state == .paused
    VStack(spacing: 16) {
      Text(recorder.state == .idle ? "Ready" : paused ? "Paused" : recorder.state == .saving ? "Saving…" : "Recording").css(13, .semibold).foregroundStyle(t.muted)
      Text(clock(recorder.secs)).css(44, .medium, ls: -0.02, mono: true).lineBox(44)
        .accessibilityLabel("Time recorded").accessibilityValue(clock(recorder.secs))
      HStack(spacing: 3) {
        ForEach(0..<40, id: \.self) { i in
          let k = recorder.levels.count - 40 + i, x = k >= 0 && k < recorder.levels.count ? recorder.levels[k] : 0
          RoundedRectangle(cornerRadius: 2, style: .continuous).fill(x > 0 ? t.text : t.line).frame(width: 3, height: (4 + x * 28).rounded())
        }
      }
      .frame(maxWidth: .infinity).frame(height: 36).accessibilityHidden(true)
      HStack(spacing: 10) {
        if !live {
          Button { flow.recStart() } label: { MakePill(label: "Start recording", icon: "mic", inv: true, hPad: 26) }.buttonStyle(.press)
        } else {
          Button { paused ? flow.recResume() : flow.recPause() } label: { MakePill(label: paused ? "Resume" : "Pause", icon: "pause", hPad: 22, bg: t.bg) }.buttonStyle(.press)
          Button { Task { await flow.recStop() } } label: { MakePill(label: "Stop", inv: true, hPad: 28) }.buttonStyle(.press)
          Button { flow.recDiscard() } label: { Icon("close", 16, 2).foregroundStyle(t.muted).frame(width: 52, height: 52).background(Circle().fill(t.bg)) }
            .buttonStyle(.press).accessibilityLabel("Discard the recording")
        }
      }
      Text("When you stop, the recording goes to Lucida, and an AI service writes it out as text. The recording stays with your deck, up to \(plural(minutes, "minute")) at a time.")
        .css(12, lh: 1.45).foregroundStyle(t.muted).multilineTextAlignment(.center).frame(maxWidth: 420)
    }
    .padding(.vertical, 22).padding(.horizontal, 20).frame(maxWidth: .infinity)
    .background(RoundedRectangle(cornerRadius: 22, style: .continuous).fill(t.surf))
  }
}

/// A picture picked from the photo library, as a file with its own name (IMG_2041.HEIC) to be made smaller.
struct PickedImage: Transferable {
  let url: URL, name: String
  static var transferRepresentation: some TransferRepresentation {
    FileRepresentation(importedContentType: .image) { received in
      let dir = FileManager.default.temporaryDirectory.appendingPathComponent("lucida-pick-" + UUID().uuidString, isDirectory: true)
      try FileManager.default.createDirectory(at: dir, withIntermediateDirectories: true)
      let to = dir.appendingPathComponent(received.file.lastPathComponent)
      try FileManager.default.copyItem(at: received.file, to: to)
      return PickedImage(url: to, name: to.lastPathComponent)
    }
  }
}

extension MakeSheet {
  /// What a picture card hides, for its row: the labels (eight at most, then "and 3 more").
  static func hidden(_ parts: [String]) -> String {
    parts.prefix(8).joined(separator: ", ") + (parts.count > 8 ? ", and \(parts.count - 8) more" : "")
  }
}

/// A picture card's picture (a small one, on white, all of it) with a box over each label that is hidden.
private struct MakeThumb: View {
  @Environment(\.theme) private var t
  let card: MakeCard
  @State private var ui: UIImage?
  var body: some View {
    ZStack {
      Color.white
      if let ui { Image(uiImage: ui).resizable().scaledToFit() }
      GeometryReader { g in
        ZStack(alignment: .topLeading) {
          ForEach(card.boxes) { b in
            // See-through yellow, like the boxes the card will have (Generated.occ), with its black edge.
            Rectangle().fill(Generated.occ.picked.color).overlay(Rectangle().strokeBorder(Color.black, lineWidth: 1))
              .frame(width: b.w * g.size.width, height: b.h * g.size.height).offset(x: b.x * g.size.width, y: b.y * g.size.height)
          }
        }
      }
    }
    .frame(width: 84, height: 64)
    .clipShape(RoundedRectangle(cornerRadius: 10, style: .continuous))
    .overlay(RoundedRectangle(cornerRadius: 10, style: .continuous).strokeBorder(t.line, lineWidth: 1))
    .task(id: card.image) {
      if let sample = DiagramSample.picture(card.image) { ui = sample }
      else if !card.image.isEmpty { ui = await Pictures.load(card.image) }
    }
    .accessibilityHidden(true)
  }
}
