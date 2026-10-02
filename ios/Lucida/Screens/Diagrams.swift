// iPhone · a deck's Diagrams (PhoneDeck's Diagrams tab, a diagram opened, the Make diagram sheet; design/diagrams.mjs, drawn here the way web/diagram.js draws them for the page). The tab
// holds the diagrams found in the lecture files a deck's cards were made from, tables and mind maps made from its cards and notes, and pictures its owner uploaded; a diagram opens as a
// sheet (a picture with its labels, a table, a mind map) with Make cards, Redo, Rename and Delete; Make diagram is a sheet of its own. What they do is Data/DiagramsData.swift.
// Everything here is Lucida's own: a question (Delete) sits in the viewer, a problem is a line in the sheet or the viewer, and the picker for Upload is a sheet like the others.
import SwiftUI
import PhotosUI
import UniformTypeIdentifiers

// ---------- small parts ----------
/// A 34-tall pill with an icon (Make diagram, Upload, Save): on the card's own color.
private struct DgPill: View {
  @Environment(\.theme) private var t
  let label: String
  var icon: String? = nil
  var fill: Color? = nil
  let action: () -> Void
  var body: some View {
    Button(action: action) {
      HStack(spacing: 6) { if let icon { Icon(icon, 14, 2) }; Text(label).css(13, .semibold).lineLimit(1).fixedSize() }
        .foregroundStyle(t.text).padding(.horizontal, 14).frame(height: 34).background(Capsule().fill(fill ?? t.bg))
    }
    .buttonStyle(.press).accessibilityLabel(label)
  }
}

/// A 48-tall pill of the viewer: black (`inv`), gray, or red words (`danger`); it grows like flex-grow in a FlexWrap.
private struct DgBig: View {
  @Environment(\.theme) private var t
  let label: String
  var icon: String? = nil
  var inv = false, danger = false
  var fill: Color? = nil
  let action: () -> Void
  var body: some View {
    Button(action: action) {
      HStack(spacing: 8) { if let icon { Icon(icon, 16, 2) }; Text(label).css(15, .semibold).lineLimit(1) }
        .foregroundStyle(inv ? t.invText : danger ? t.again : t.text).frame(maxWidth: .infinity).frame(height: 48)
        .background(Capsule().fill(inv ? t.inv : fill ?? t.surf))
    }
    .buttonStyle(.press).accessibilityLabel(label)
  }
}

/// The round close button of a sheet's top (40).
private struct DgClose: View {
  @Environment(\.theme) private var t
  let action: () -> Void
  var body: some View {
    Button(action: action) { Icon("close", 16, 2).foregroundStyle(t.text).frame(width: 40, height: 40).background(Circle().fill(t.surf)) }
      .buttonStyle(.press).accessibilityLabel("Close")
  }
}

/// A calm bar for something being sent or made: a short bar drifts slowly from one end to the other and back (nothing blinks; it holds still with Reduce Motion).
private struct DriftBar: View {
  @Environment(\.theme) private var t
  @Environment(\.accessibilityReduceMotion) private var still
  @State private var far = false
  var body: some View {
    GeometryReader { g in
      let w = g.size.width * 0.34
      ZStack(alignment: .leading) {
        Capsule().fill(t.surf2)
        Capsule().fill(t.inv).frame(width: w).offset(x: still ? g.size.width * 0.33 : far ? g.size.width - w : 0)
      }
    }
    .frame(height: 6)
    .clipShape(Capsule())
    .onAppear { if !still && !Motion.still { withAnimation(.easeInOut(duration: 2.6).repeatForever(autoreverses: true)) { far = true } } }
    .accessibilityHidden(true)
  }
}

// ---------- pictures ----------
/// Pictures of diagrams: a tile's small copy, and the full one (from the library's storage; a sample on a design screen). Kept in memory once fetched.
@MainActor
enum DiagramArt {
  private static let thumbs = NSCache<NSString, UIImage>()
  static func thumb(_ f: DiagramFile) async -> UIImage? {
    if let d = DiagramSample.picture(f.name) { return d }
    let key = f.name as NSString
    if let hit = thumbs.object(forKey: key) { return hit }
    guard let url = API.media("/media/" + f.name), let got = try? await URLSession.shared.data(from: url), let img = UIImage(data: got.0) else { return nil }
    let small = await img.byPreparingThumbnail(ofSize: CGSize(width: 480, height: 480)) ?? img
    thumbs.setObject(small, forKey: key)
    return small
  }
  static func full(_ f: DiagramFile) async -> UIImage? {
    if let d = DiagramSample.picture(f.name) { return d }
    return await Pictures.load("/media/" + f.name)
  }
}

/// What a tile shows above the name: a picture (on white, all of it), or the kind's drawing for a table and a mind map.
private struct DiagramThumb: View {
  @Environment(\.theme) private var t
  let vm: DiagramVM
  @State private var ui: UIImage?
  var body: some View {
    ZStack {
      if let f = vm.info.file {
        Color.white
        if let ui { Image(uiImage: ui).resizable().scaledToFit() }
        Color.clear.task(id: f.name) { ui = await DiagramArt.thumb(f) }
      } else {
        Icon(vm.info.kind == "table" ? "table" : "mindmap", 34, 1.5).foregroundStyle(t.muted)
      }
    }
  }
}

/// A diagram's picture at the width it is given, all of it, with a box over each label when `boxes` are shown (their places are fractions of the picture, like a card's).
private struct DiagramPicture: View {
  @Environment(\.theme) private var t
  let file: DiagramFile
  var boxes: [OccBox] = []
  var showBoxes = false
  var alt = ""
  @State private var ui: UIImage?
  var body: some View {
    let ratio: CGFloat = file.w > 0 && file.h > 0 ? CGFloat(file.w) / CGFloat(file.h) : ui.map { $0.size.height > 0 ? $0.size.width / $0.size.height : 4 / 3 } ?? 4 / 3
    Color.white.aspectRatio(ratio, contentMode: .fit)
      .overlay { if let ui { Image(uiImage: ui).resizable().scaledToFit() } }
      .overlay { if showBoxes { DiagramBoxes(boxes: boxes) } }
      .clipShape(RoundedRectangle(cornerRadius: 14, style: .continuous))
      .overlay(RoundedRectangle(cornerRadius: 14, style: .continuous).strokeBorder(t.line, lineWidth: 1))
      .task(id: file.name) { ui = await DiagramArt.full(file) }
      .accessibilityElement(children: .ignore).accessibilityLabel(alt.isEmpty ? "The picture" : alt).accessibilityAddTraits(.isImage)
  }
}
private struct DiagramBoxes: View {
  let boxes: [OccBox]
  var body: some View {
    GeometryReader { g in
      ZStack(alignment: .topLeading) {
        ForEach(boxes) { b in
          RoundedRectangle(cornerRadius: 3, style: .continuous).fill(Color.white.opacity(0.32))
            .overlay(RoundedRectangle(cornerRadius: 3, style: .continuous).strokeBorder(Color.black, lineWidth: 1.5))
            .background(RoundedRectangle(cornerRadius: 4, style: .continuous).fill(Color.white.opacity(0.9)).padding(-1))
            .frame(width: b.w * g.size.width, height: b.h * g.size.height)
            .offset(x: b.x * g.size.width, y: b.y * g.size.height)
        }
      }
    }
    .allowsHitTesting(false).accessibilityHidden(true)
  }
}

// ---------- the tab ----------
/// The Diagrams tab's card: its count and (for the deck's owner) Make diagram and Upload, an upload on its way or not working, and the diagrams in groups (Made, From your lectures,
/// Uploaded) as tiles two across.
struct DiagramsCard: View {
  @Environment(\.theme) private var t
  @EnvironmentObject private var store: Store
  @EnvironmentObject private var nav: Nav
  @ObservedObject var flow: DiagramsFlow
  let deckId: String
  let rows: [DiagramVM]
  let can: Bool
  @State private var pickingPhoto = false
  @State private var pickingFile = false
  @State private var photo: PhotosPickerItem?

  var body: some View {
    let groups = DiagramVM.groups.map { g in (title: g, items: rows.filter { $0.group == g }) }.filter { !$0.items.isEmpty }
    let sending = flow.upDeck == deckId ? flow.uploading : nil, bad = flow.upDeck == deckId ? flow.upError : ""
    VStack(alignment: .leading, spacing: 14) {
      FlexWrap(gap: 10) {
        Text("DIAGRAMS").css(13, .semibold, ls: 0.06).foregroundStyle(t.muted).fixedSize().accessibilityAddTraits(.isHeader)
        Text(String(rows.count)).css(12, mono: true).foregroundStyle(t.muted).fixedSize()
        Color.clear.frame(width: 0, height: 0).flexGrow()
        if can {
          HStack(spacing: 6) {
            DgPill(label: "Make diagram", icon: "sparkle") { openSheet() }
            DgPill(label: "Upload", icon: "upload") { chooseUpload() }
          }
        }
      }
      .frame(minHeight: 34)
      if let name = sending {
        VStack(alignment: .leading, spacing: 8) {
          Text("Sending " + name + "…").css(14, .semibold).lineLimit(1)
          DriftBar()
        }
        .padding(.horizontal, 14).padding(.vertical, 12).frame(maxWidth: .infinity, alignment: .leading)
        .background(RoundedRectangle(cornerRadius: 16, style: .continuous).fill(t.bg))
        .accessibilityElement(children: .combine).accessibilityLabel("Sending " + name)
      }
      if !bad.isEmpty {
        HStack(alignment: .top, spacing: 10) {
          Text(bad).css(14, lh: 1.4).foregroundStyle(t.again).frame(maxWidth: .infinity, alignment: .leading)
          Button { flow.dismissUploadError() } label: { Icon("close", 13, 2).foregroundStyle(t.muted).frame(width: 28, height: 28).contentShape(Circle()) }
            .buttonStyle(.flat).accessibilityLabel("Dismiss")
        }
        .padding(.horizontal, 14).padding(.vertical, 12)
        .background(RoundedRectangle(cornerRadius: 16, style: .continuous).fill(t.bg))
      }
      if rows.isEmpty && can {
        VStack(alignment: .leading, spacing: 6) {
          Text("Nothing here yet").css(15, .semibold)
          Text("When Lucida makes cards from slides, a PDF, a Word file or photos, the diagrams in them are kept here, and you can turn their labels into picture cards. You can also make a table or a mind map from your cards, or upload a picture.")
            .css(13, lh: 1.5).foregroundStyle(t.muted)
        }
        .padding(.top, 14).padding(.bottom, 6).frame(maxWidth: .infinity, alignment: .leading)
        .overlay(alignment: .top) { t.line.frame(height: 1) }
      }
      ForEach(groups, id: \.title) { g in
        VStack(alignment: .leading, spacing: 10) {
          Text(g.title.uppercased()).css(12, .semibold, ls: 0.06).foregroundStyle(t.muted).accessibilityAddTraits(.isHeader)
          LazyVGrid(columns: [GridItem(.flexible(), spacing: 12), GridItem(.flexible(), spacing: 12)], spacing: 12) {
            ForEach(g.items) { x in DiagramTile(vm: x) { open(x) } }
          }
        }
      }
    }
    .padding(.horizontal, 18).padding(.top, 18).padding(.bottom, 20)
    .frame(maxWidth: .infinity, alignment: .leading)
    .background(RoundedRectangle(cornerRadius: 22, style: .continuous).fill(t.surf))
    .accessibilityElement(children: .contain).accessibilityLabel("Diagrams")
    .photosPicker(isPresented: $pickingPhoto, selection: $photo, matching: .images)
    .onChange(of: photo) { _, item in
      guard let item else { return }
      photo = nil
      Task { await flow.upload(store, deckId: deckId, name: "Photo") { try? await item.loadTransferable(type: Data.self) } }
    }
    .fileImporter(isPresented: $pickingFile, allowedContentTypes: [.image]) { r in
      guard case .success(let url) = r else { return }
      Task { await flow.upload(store, deckId: deckId, file: url) }
    }
  }

  private func open(_ x: DiagramVM) {
    flow.resetViewer()
    withAnimation(Motion.sheet) { nav.sheet = .diagram(deckId: deckId, id: x.id) }
  }
  private func openSheet() {
    flow.openSheet()
    withAnimation(Motion.sheet) { nav.sheet = .makeDiagram(deckId) }
  }
  /// Upload asks where the picture is (the Photos or Files), in a sheet of Lucida's own; the phone's picker for that place comes after.
  private func chooseUpload() {
    guard !store.demo, flow.uploading == nil else { return }
    nav.picker = PickRequest(title: "Upload a picture", rows: [PickRow(id: "photos", words: "Photo library", sub: "A photo or a screenshot"), PickRow(id: "files", words: "Files", sub: "A picture saved on this iPhone")]) { row in
      guard let row else { return }
      if row.id == "photos" { pickingPhoto = true } else { pickingFile = true }
    }
  }
}

/// One diagram of the list: its picture (or the drawing of its kind), its name (two lines at most), and what it is.
private struct DiagramTile: View {
  @Environment(\.theme) private var t
  let vm: DiagramVM
  let open: () -> Void
  var body: some View {
    Button(action: open) {
      VStack(spacing: 0) {
        Color.clear.aspectRatio(4 / 3, contentMode: .fit)
          .overlay { DiagramThumb(vm: vm) }
          .clipShape(UnevenRoundedRectangle(topLeadingRadius: 18, topTrailingRadius: 18, style: .continuous))
          .overlay(UnevenRoundedRectangle(topLeadingRadius: 18, topTrailingRadius: 18, style: .continuous).strokeBorder(t.line, lineWidth: 1))
        VStack(alignment: .leading, spacing: 2) {
          Text(vm.name).css(14, .semibold, lh: 1.3).lineLimit(2).frame(maxWidth: .infinity, alignment: .leading)
          Text(vm.line).css(12).foregroundStyle(t.muted).lineLimit(1).frame(maxWidth: .infinity, alignment: .leading)
        }
        .padding(.horizontal, 12).padding(.top, 10).padding(.bottom, 12)
        // (Two tiles side by side are as tall as the taller one, like the page's grid.)
        Spacer(minLength: 0)
      }
      .frame(maxHeight: .infinity, alignment: .top)
      .foregroundStyle(t.text)
      .background(RoundedRectangle(cornerRadius: 18, style: .continuous).fill(t.bg))
      .clipShape(RoundedRectangle(cornerRadius: 18, style: .continuous))
    }
    .buttonStyle(.press)
    .accessibilityLabel("Open " + vm.name).accessibilityValue(vm.line)
  }
}

// ---------- a table and a mind map ----------
/// A table as the page draws it: the headings on top in small capitals, the first column naming each row; it scrolls sideways when it is wider than the screen.
struct DiagramTableView: View {
  @Environment(\.theme) private var t
  let table: DiagramTable
  let title: String
  var width: CGFloat = UIScreen.main.bounds.width - 40
  var body: some View {
    let n = max(1, table.columns.count)
    // (Each column at least as wide as its words need on the page: 130 and 150 points, with 16 on each side; what is left over is shared.)
    let mins = (0..<n).map { $0 == 0 ? 162.0 : 182.0 }
    let extra = max(0, width - mins.reduce(0, +)) / CGFloat(n)
    let widths = mins.map { CGFloat($0) + extra }
    ScrollView(.horizontal, showsIndicators: false) {
      VStack(spacing: 0) {
        HStack(alignment: .top, spacing: 0) {
          ForEach(0..<n, id: \.self) { i in
            Text((i < table.columns.count ? table.columns[i] : "").uppercased()).font(.geist(12, .semibold)).tracking(0.6).foregroundStyle(t.muted).lineLimit(1)
              .frame(width: widths[i] - 32, alignment: .leading).padding(.horizontal, 16).padding(.vertical, 11)
          }
        }
        .overlay(alignment: .bottom) { t.line.frame(height: 1) }
        .accessibilityHidden(true)
        ForEach(Array(table.rows.enumerated()), id: \.offset) { k, row in
          HStack(alignment: .top, spacing: 0) {
            ForEach(0..<n, id: \.self) { i in
              Text(i < row.count ? row[i] : "").css(14, i == 0 ? .semibold : .regular, lh: 1.45).foregroundStyle(t.text)
                .frame(width: widths[i] - 32, alignment: .leading).padding(.horizontal, 16).padding(.vertical, 11)
            }
          }
          .overlay(alignment: .bottom) { if k < table.rows.count - 1 { t.line.frame(height: 1) } }
          .accessibilityElement(children: .ignore).accessibilityLabel(label(row))
        }
      }
      .frame(width: widths.reduce(0, +), alignment: .leading)
    }
    .background(RoundedRectangle(cornerRadius: 16, style: .continuous).fill(t.surf))
    .clipShape(RoundedRectangle(cornerRadius: 16, style: .continuous))
    .accessibilityElement(children: .contain).accessibilityLabel(title.isEmpty ? "Table" : title)
  }
  /// A row read aloud: what it is about, then each heading with its words.
  private func label(_ row: [String]) -> String {
    (0..<max(1, table.columns.count)).map { i in
      let word = i < row.count ? row[i] : ""
      return i == 0 || i >= table.columns.count ? word : table.columns[i] + ": " + word
    }.joined(separator: ". ")
  }
}

/// A mind map: the topic on the left, its main ideas in the next column, their details in the third (DiagramLayout, the same numbers as the page's); it scrolls sideways when it is wider than the screen.
struct DiagramMapView: View {
  @Environment(\.theme) private var t
  let tree: DiagramNode
  let title: String
  var body: some View {
    let g = DiagramLayout(tree)
    ScrollView(.horizontal, showsIndicators: false) {
      ZStack(alignment: .topLeading) {
        Path { p in
          for l in g.links {
            let m = (l.x1 + l.x2) / 2
            p.move(to: CGPoint(x: l.x1, y: l.y1))
            p.addCurve(to: CGPoint(x: l.x2, y: l.y2), control1: CGPoint(x: m, y: l.y1), control2: CGPoint(x: m, y: l.y2))
          }
        }
        .stroke(t.line, style: StrokeStyle(lineWidth: 1.5, lineCap: .round))
        .accessibilityHidden(true)
        ForEach(g.nodes) { n in node(n).offset(x: n.x, y: n.y) }
      }
      .frame(width: g.width, height: g.height, alignment: .topLeading)
    }
    .background(RoundedRectangle(cornerRadius: 16, style: .continuous).fill(t.surf))
    .clipShape(RoundedRectangle(cornerRadius: 16, style: .continuous))
    .accessibilityElement(children: .contain).accessibilityLabel(title.isEmpty ? "Mind map" : title)
  }
  private func node(_ n: DiagramLayout.Node) -> some View {
    let fill: Color = n.level == 0 ? t.inv : n.level == 1 ? t.surf2 : t.bg
    let ink: Color = n.level == 0 ? t.invText : t.text
    let size: CGFloat = n.level == 0 ? 14 : n.level == 1 ? 13 : 12.5
    let shape = RoundedRectangle(cornerRadius: n.level == 0 ? 16 : 12, style: .continuous)
    return VStack(spacing: 0) {
      ForEach(Array(n.lines.enumerated()), id: \.offset) { _, s in
        Text(s).font(.geist(size, n.level == 2 ? .medium : .semibold)).lineLimit(1).fixedSize().frame(height: DiagramLayout.lineH)
      }
    }
    .foregroundStyle(ink)
    .frame(width: n.w, height: n.h)
    .background(shape.fill(fill))
    .overlay { if n.level == 2 { shape.strokeBorder(t.line, lineWidth: 1.5) } }
    .accessibilityElement(children: .ignore).accessibilityLabel(n.lines.joined(separator: " "))
    .accessibilityHint(n.level == 0 ? "The topic" : n.level == 1 ? "A main idea" : "A detail")
  }
}

// ---------- a diagram opened ----------
/// The sheet a diagram opens in, over the page: asks the library for it each time, so one that was deleted closes it.
struct DiagramHost: View {
  @EnvironmentObject private var store: Store
  @EnvironmentObject private var nav: Nav
  let deckId: String, id: String
  var body: some View {
    SheetOverlay(top: 56, radius: 32, close: shut) {
      if let vm = store.diagram(deckId, id) { DiagramViewer(flow: store.diagrams, deckId: deckId, vm: vm, can: store.guide(deckId).can, shut: shut) }
      else { Color.clear.frame(height: 200).onAppear { shut() } }
    }
  }
  private func shut() { store.diagrams.resetViewer(); nav.close() }
}

struct DiagramViewer: View {
  @Environment(\.theme) private var t
  @EnvironmentObject private var store: Store
  @EnvironmentObject private var nav: Nav
  @ObservedObject var flow: DiagramsFlow
  let deckId: String
  let vm: DiagramVM
  let can: Bool
  let shut: () -> Void
  @FocusState private var naming: Bool

  var body: some View {
    let g = vm.info
    VStack(alignment: .leading, spacing: 16) {
      header
      ScrollView(showsIndicators: false) {
        VStack(alignment: .leading, spacing: 14) {
          if let f = g.file { picture(g, f) }
          if let table = g.table, g.kind == "table" { DiagramTableView(table: table, title: vm.name) }
          if let tree = g.tree, g.kind == "mindmap" { DiagramMapView(tree: tree, title: vm.name) }
          let where_ = vm.whereLine(can: can)
          if !where_.isEmpty { Text(where_).css(13, lh: 1.5).foregroundStyle(t.muted).frame(maxWidth: .infinity, alignment: .leading) }
        }
        .frame(maxWidth: .infinity, alignment: .leading)
      }
      if !flow.msg.isEmpty { Text(flow.msg).css(14, lh: 1.4).foregroundStyle(t.again).frame(maxWidth: .infinity, alignment: .leading).accessibilityAddTraits(.isStaticText) }
      if flow.confirm { ask }
      if can && !flow.renaming && !flow.confirm { actions }
    }
    .padding(.top, 20).padding(.horizontal, 20).padding(.bottom, 34)
    .foregroundStyle(t.text)
    .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .top)
    .onChange(of: flow.draft) { _, v in if v.count > 80 { flow.draft = String(v.prefix(80)) } }
    .onChange(of: flow.renaming) { _, on in if on && !store.demo { DispatchQueue.main.asyncAfter(deadline: .now() + 0.3) { naming = true } } }
  }

  // ---------- the top: its name (or the name being typed), what it is, and close ----------
  private var header: some View {
    HStack(alignment: .top, spacing: 12) {
      if flow.renaming {
        VStack(alignment: .leading, spacing: 8) {
          TextField("", text: $flow.draft, prompt: Text("Name").foregroundStyle(t.muted))
            .font(.geist(17, .semibold)).foregroundStyle(t.text).focused($naming).submitLabel(.done).autocorrectionDisabled()
            .onSubmit { rename() }
            .padding(.horizontal, 16).frame(height: 48)
            .background(RoundedRectangle(cornerRadius: 16, style: .continuous).fill(t.surf))
            .accessibilityLabel("Name")
          HStack(spacing: 8) {
            DgPill(label: "Save", icon: "check", fill: t.surf) { rename() }
            DgPill(label: "Cancel", fill: t.surf) { flow.cancelRename() }
          }
        }
        .frame(maxWidth: .infinity, alignment: .leading)
      } else {
        VStack(alignment: .leading, spacing: 2) {
          Text(vm.name).css(22, .semibold, ls: -0.02).fixedSize(horizontal: false, vertical: true).accessibilityAddTraits(.isHeader)
          Text(vm.viewerLine).css(13).foregroundStyle(t.muted)
        }
        .frame(maxWidth: .infinity, alignment: .leading)
      }
      DgClose(action: shut)
    }
  }

  // ---------- a picture and its labels ----------
  @ViewBuilder private func picture(_ g: DiagramInfo, _ f: DiagramFile) -> some View {
    let labels = g.labels ?? []
    DiagramPicture(file: f, boxes: labels, showBoxes: flow.boxes && !labels.isEmpty, alt: vm.name)
    if !labels.isEmpty {
      VStack(alignment: .leading, spacing: 10) {
        HStack(spacing: 10) {
          Text(plural(labels.count, "label").uppercased()).css(13, .semibold, ls: 0.06).foregroundStyle(t.muted).accessibilityAddTraits(.isHeader)
          Spacer(minLength: 0)
          DgPill(label: flow.boxes ? "Hide boxes" : "Show boxes", fill: t.surf) { flow.boxes.toggle() }.accessibilityAddTraits(flow.boxes ? .isSelected : [])
        }
        FlowLayout(spacing: 6, lineSpacing: 6) {
          ForEach(Array(labels.enumerated()), id: \.offset) { _, l in
            Text(l.label).css(13, .medium).lineLimit(1).padding(.horizontal, 12).frame(height: 30).background(Capsule().fill(t.surf))
          }
        }
      }
    }
    let note = vm.noteLine
    if !note.isEmpty { Text(note).css(13, lh: 1.5).foregroundStyle(t.muted).frame(maxWidth: .infinity, alignment: .leading) }
  }

  // ---------- Delete asked ----------
  private var ask: some View {
    let g = vm.info
    return VStack(alignment: .leading, spacing: 12) {
      Text("Delete “" + vm.name + "”?").css(15, .semibold, lh: 1.4)
      let note = g.isMade ? "You can make another one any time." : g.isPicture ? "Its picture goes. Cards made from it keep their own picture." : ""
      if !note.isEmpty { Text(note).css(13, lh: 1.45).foregroundStyle(t.muted) }
      HStack(spacing: 8) {
        DgBig(label: "Keep it", fill: t.bg) { flow.keep() }
        DgBig(label: flow.busy == "delete" ? "Deleting…" : "Delete", danger: true, fill: t.bg) { remove() }
      }
    }
    .padding(.horizontal, 18).padding(.vertical, 16).frame(maxWidth: .infinity, alignment: .leading)
    .background(RoundedRectangle(cornerRadius: 20, style: .continuous).fill(t.surf))
    .accessibilityElement(children: .contain).accessibilityLabel("Delete this diagram")
  }

  // ---------- what can be done with it ----------
  private var actions: some View {
    let g = vm.info, canCards = g.isPicture && !(g.labels?.isEmpty ?? false)
    let cardsLabel = flow.busy == "cards" ? (g.labels == nil ? "Reading the labels…" : "Opening…") : "Make cards"
    return FlexWrap(gap: 8) {
      if canCards { DgBig(label: cardsLabel, icon: "sparkle", inv: true) { makeCards() }.flexGrow(2).flexBasisZero().flexMin(120) }
      if g.isMade { DgBig(label: flow.busy == "redo" ? "Making it again…" : "Redo", inv: true) { redo() }.flexGrow(2).flexBasisZero().flexMin(120) }
      DgBig(label: "Rename") { flow.startRename(vm.name) }.flexGrow(1).flexBasisZero().flexMin(120)
      DgBig(label: "Delete", danger: true) { flow.askDelete() }.flexGrow(1).flexBasisZero().flexMin(120)
    }
  }

  private func rename() { Task { await flow.rename(store, deckId: deckId, id: vm.id) } }
  private func redo() { Task { await flow.redo(store, deckId: deckId, id: vm.id) } }
  private func remove() { Task { if await flow.remove(store, deckId: deckId, id: vm.id) { shut() } } }
  /// Make cards: the picture and its labels go to the card editor, as a new Image card with a box over each label, to check and move before it is saved.
  private func makeCards() {
    Task { await flow.cards(store, deckId: deckId, id: vm.id) { _ in flow.resetViewer(); nav.newCard(deckId: deckId) } }
  }
}

// ---------- the Make diagram sheet ----------
struct MakeDiagramHost: View {
  @EnvironmentObject private var store: Store
  @EnvironmentObject private var nav: Nav
  let deckId: String
  var body: some View {
    // (While it is being made the sheet stays: Cancel, or the diagram arriving, ends it.)
    SheetOverlay(top: nil, radius: 32, close: { if !store.diagrams.making { shut() } }) { MakeDiagramSheet(flow: store.diagrams, deckId: deckId, shut: shut) }
  }
  private func shut() { store.diagrams.closeSheet(); nav.close() }
}

/// Table or Mind map, from what (everything, one tag's cards, or one source's), then it is made: one AI step of the day, with a calm bar and a way out.
struct MakeDiagramSheet: View {
  @Environment(\.theme) private var t
  @EnvironmentObject private var store: Store
  @EnvironmentObject private var nav: Nav
  @ObservedObject var flow: DiagramsFlow
  let deckId: String
  let shut: () -> Void

  var body: some View {
    let word = flow.type == "mindmap" ? "mind map" : "table"
    VStack(alignment: .leading, spacing: 18) {
      HStack(spacing: 10) {
        Text("Make diagram").css(22, .semibold, ls: -0.02).frame(maxWidth: .infinity, alignment: .leading).accessibilityAddTraits(.isHeader)
        DgClose(action: shut)
      }
      .frame(minHeight: 40)
      if flow.making { making(word) }
      else if let e = flow.makeError { failed(e) }
      else { setUp(word) }
    }
    .padding(.top, 20).padding(.horizontal, 20).padding(.bottom, 34)
    .foregroundStyle(t.text)
  }

  // ---------- set up ----------
  private func setUp(_ word: String) -> some View {
    let d = store.deck(deckId)
    var seen = Set<String>(), tags: [String] = []
    for r in d.rows { for g in r.tags where !seen.contains(g) { seen.insert(g); tags.append(g) } }
    let sources = Array(store.sources(deckId).prefix(6)), few = d.rows.count < 3, scope = flow.scope
    return VStack(alignment: .leading, spacing: 18) {
      VStack(alignment: .leading, spacing: 8) {
        Text("Make a").css(13, .semibold)
        DgTypePick(current: flow.type) { flow.type = $0; flow.makeError = nil }
      }
      VStack(alignment: .leading, spacing: 8) {
        Text("From").css(13, .semibold)
        FlowLayout(spacing: 6, lineSpacing: 6) {
          chip("All cards and notes", on: scope.kind == "all", source: false) { flow.setScope("all", "") }
          ForEach(Array(tags.prefix(8)), id: \.self) { g in chip(g, on: scope.kind == "tag" && scope.value == g, source: false) { flow.setScope("tag", g) } }
          ForEach(sources) { s in chip(s.name, on: scope.kind == "source" && scope.value == s.id, source: true) { flow.setScope("source", s.id) } }
        }
        Text(scope.kind == "all" ? "Lucida reads every card and your notes." : scope.kind == "tag" ? "Only the cards tagged " + scope.value + "." : "Only the cards made from this source.")
          .css(12, lh: 1.45).foregroundStyle(t.muted)
      }
      if few { Text("Add a few cards first: Lucida needs something to make a " + word + " from.").css(14, lh: 1.4).foregroundStyle(t.again) }
      FlexRow(spacing: 10) {
        Button(action: shut) { Text("Cancel").css(15, .semibold).foregroundStyle(t.text).frame(maxWidth: .infinity).frame(height: 52).background(Capsule().fill(t.surf)) }
          .buttonStyle(.press).grow(1).basis0()
        Button { if !few { make() } } label: {
          HStack(spacing: 8) { Icon("sparkle", 16, 2); Text("Make " + word).css(15, .semibold) }
            .foregroundStyle(few ? t.muted : t.invText).frame(maxWidth: .infinity).frame(height: 52).background(Capsule().fill(few ? t.surf2 : t.inv))
        }
        .buttonStyle(.press).grow(2).basis0()
        .accessibilityLabel("Make " + word).accessibilityAddTraits(few ? .isStaticText : .isButton)
      }
    }
  }

  private func chip(_ label: String, on: Bool, source: Bool, pick: @escaping () -> Void) -> some View {
    Button(action: pick) {
      HStack(spacing: 6) {
        if source { Icon("file", 13, 2) }
        Text(label).css(13, .semibold).lineLimit(1)
      }
      .foregroundStyle(on ? t.invText : t.text).padding(.horizontal, 14).frame(height: 34).background(Capsule().fill(on ? t.inv : t.surf))
    }
    .buttonStyle(.press).accessibilityLabel(label).accessibilityAddTraits(on ? .isSelected : [])
  }

  // ---------- being made ----------
  private func making(_ word: String) -> some View {
    VStack(alignment: .leading, spacing: 22) {
      VStack(alignment: .leading, spacing: 8) {
        Text(flow.type == "mindmap" ? "Drawing your mind map" : "Writing your table").css(17, .semibold, ls: -0.01)
        Text("Lucida is reading your cards. It takes a few seconds.").css(14).foregroundStyle(t.muted)
      }
      .padding(.top, 18)
      .accessibilityElement(children: .combine)
      DriftBar()
      Button(action: shut) { Text("Cancel").css(15, .semibold).foregroundStyle(t.text).frame(maxWidth: .infinity).frame(height: 48).background(Capsule().fill(t.surf)) }
        .buttonStyle(.press)
    }
  }

  // ---------- it didn't work ----------
  private func failed(_ e: MakeErr) -> some View {
    VStack(alignment: .leading, spacing: 18) {
      Text(e.message).css(17, .semibold, lh: 1.35).padding(.top, 8).frame(maxWidth: .infinity, alignment: .leading).accessibilityAddTraits(.isStaticText)
      FlexRow(spacing: 10) {
        Button { flow.openSheet() } label: { Text("Back").css(15, .semibold).foregroundStyle(t.text).frame(maxWidth: .infinity).frame(height: 52).background(Capsule().fill(t.surf)) }
          .buttonStyle(.press).grow(1).basis0()
        if e.pro {
          Button { nav.goPro() } label: { Text("Go Pro").css(15, .semibold).foregroundStyle(t.invText).frame(maxWidth: .infinity).frame(height: 52).background(Capsule().fill(t.inv)) }
            .buttonStyle(.press).grow(2).basis0()
        }
        if e.again {
          Button { make() } label: { Text("Try again").css(15, .semibold).foregroundStyle(t.invText).frame(maxWidth: .infinity).frame(height: 52).background(Capsule().fill(t.inv)) }
            .buttonStyle(.press).grow(2).basis0()
        }
      }
    }
  }

  private func make() {
    Task {
      await flow.make(store, deckId: deckId) { id in
        flow.resetViewer()
        guard !id.isEmpty else { shut(); return }
        withAnimation(Motion.sheet) { nav.sheet = .diagram(deckId: deckId, id: id) }
      }
    }
  }
}

/// Table or Mind map: two choices on a gray track, the chosen one white with a soft shadow; the pill slides to the one you tap.
private struct DgTypePick: View {
  @Environment(\.theme) private var t
  @Namespace private var pill
  @State private var taps = 0
  let current: String
  let pick: (String) -> Void
  var body: some View {
    HStack(spacing: 0) {
      ForEach([(id: "table", label: "Table"), (id: "mindmap", label: "Mind map")], id: \.id) { o in
        let on = o.id == current
        Button { if !on { taps += 1 }; pick(o.id) } label: {
          HStack(spacing: 8) { Icon(o.id, 16, 1.8); Text(o.label).css(14, .semibold).lineLimit(1) }
            .foregroundStyle(on ? t.text : t.muted).padding(.horizontal, 6).frame(maxWidth: .infinity).frame(height: 40)
            .background { if on { Capsule().fill(t.bg).shadow(color: .black.opacity(0.14), radius: 1.5, x: 0, y: 1).matchedGeometryEffect(id: "pill", in: pill) } }
            .contentShape(Capsule())
        }
        .buttonStyle(.plain).accessibilityLabel(o.label).accessibilityAddTraits(on ? .isSelected : [])
      }
    }
    .animation(Motion.knob, value: current)
    .padding(4).background(Capsule().fill(t.surf))
    .haptic(.selection, on: taps, "kind of diagram")
    .accessibilityElement(children: .contain).accessibilityLabel("Kind of diagram")
  }
}

// ---------- a shared deck's tables and mind maps ----------
/// What a shared deck's page shows of its Diagrams: the tables and mind maps made from its cards (never the pictures from its owner's lectures or uploads), one row each,
/// read only; a row opens the table or the map in a sheet.
struct PublicDiagramsCard: View {
  @Environment(\.theme) private var t
  @EnvironmentObject private var nav: Nav
  let addr: DeckAddress
  let rows: [DiagramVM]
  var body: some View {
    VStack(alignment: .leading, spacing: 12) {
      HStack(spacing: 10) {
        Text("DIAGRAMS").css(13, .semibold, ls: 0.06).foregroundStyle(t.muted).accessibilityAddTraits(.isHeader)
        Text(String(rows.count)).css(12, mono: true).foregroundStyle(t.muted)
        Spacer(minLength: 0)
      }
      VStack(spacing: 8) {
        ForEach(rows) { x in
          Button { withAnimation(Motion.sheet) { nav.sheet = .publicDiagram(addr, x.id) } } label: {
            HStack(spacing: 12) {
              Icon(x.info.kind == "table" ? "table" : "mindmap", 17, 1.8).foregroundStyle(t.text).frame(width: 36, height: 36).background(Circle().fill(t.surf))
              VStack(alignment: .leading, spacing: 1) {
                Text(x.name).css(14, .semibold).lineLimit(1)
                Text(x.line).css(12).foregroundStyle(t.muted).lineLimit(1)
              }
              .frame(maxWidth: .infinity, alignment: .leading)
              Icon("chev", 15, 2).foregroundStyle(t.muted)
            }
            .foregroundStyle(t.text).padding(.leading, 10).padding(.trailing, 12).padding(.vertical, 8).frame(minHeight: 60)
            .background(RoundedRectangle(cornerRadius: 16, style: .continuous).fill(t.bg))
          }
          .buttonStyle(.press).accessibilityLabel("Open " + x.name).accessibilityValue(x.line)
        }
      }
    }
    .padding(.horizontal, 18).padding(.top, 18).padding(.bottom, 16)
    .frame(maxWidth: .infinity, alignment: .leading)
    .background(RoundedRectangle(cornerRadius: 22, style: .continuous).fill(t.surf))
    .accessibilityElement(children: .contain).accessibilityLabel("Diagrams")
  }
}

/// The sheet a shared deck's table or mind map opens in: its name, what it is, and the diagram.
struct PublicDiagramHost: View {
  @Environment(\.theme) private var t
  @EnvironmentObject private var store: Store
  @EnvironmentObject private var nav: Nav
  let addr: DeckAddress, id: String
  var body: some View {
    SheetOverlay(top: 56, radius: 32, close: nav.close) {
      if let g = store.netDeckPage(addr)?.value?.guide?.diagrams.first(where: { $0.id == id }) { viewer(DiagramVM(info: g)) }
      else { Color.clear.frame(height: 200).onAppear { nav.close() } }
    }
  }
  private func viewer(_ vm: DiagramVM) -> some View {
    VStack(alignment: .leading, spacing: 16) {
      HStack(alignment: .top, spacing: 12) {
        VStack(alignment: .leading, spacing: 2) {
          Text(vm.name).css(22, .semibold, ls: -0.02).fixedSize(horizontal: false, vertical: true).accessibilityAddTraits(.isHeader)
          Text(vm.line).css(13).foregroundStyle(t.muted)
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        DgClose(action: nav.close)
      }
      ScrollView(showsIndicators: false) {
        VStack(alignment: .leading, spacing: 14) {
          if let table = vm.info.table, vm.info.kind == "table" { DiagramTableView(table: table, title: vm.name) }
          if let tree = vm.info.tree, vm.info.kind == "mindmap" { DiagramMapView(tree: tree, title: vm.name) }
        }
        .frame(maxWidth: .infinity, alignment: .leading)
      }
    }
    .padding(.top, 20).padding(.horizontal, 20).padding(.bottom, 34)
    .foregroundStyle(t.text)
    .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .top)
  }
}
