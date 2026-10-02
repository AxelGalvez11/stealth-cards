// The canvas's sample for the Diagrams boards (design/diagrams.mjs DIAGRAMS_MOCK): the sample deck's six diagrams (a table and a mind map made from its cards, three pictures found
// in its lecture slides, and one uploaded picture), the pictures themselves (three small drawings in Resources/demo-*.png, drawn from the canvas's own), and the settings of the deck boards'
// `guide` Tweak that are about Diagrams. A design screen asks for these where a real one asks the library (`Store.diagramRows`), and `-state <value>` picks one.
import SwiftUI

enum DiagramSample {
  /// The deck page's `guide` setting values about Diagrams (the canvas's DIAGRAM_STATES): the tab, a diagram open (a picture, an uploaded one, a table, a mind map), being renamed or
  /// asked to be deleted, an upload on its way or not working, the Make diagram sheet (set up, making, or not working), and a deck that is only studied.
  static let states = ["Diagrams", "Diagrams (none yet)", "A picture open", "An uploaded picture open", "A table open", "A mind map open", "Renaming a diagram", "Delete asked", "Uploading a picture",
                       "Upload didn’t work", "Make diagram", "Making a diagram", "Make diagram (it didn’t work)", "Diagrams (studying)"]
  static func isState(_ s: String) -> Bool { states.contains(s) }
  /// The states that are the deck's only studied, not its own (nothing to change: no Make diagram, no Upload, no Sources).
  static func readOnly(_ s: String) -> Bool { s == "Diagrams (studying)" }

  static let table = DiagramTable(columns: ["Organelle", "What it does", "Found in"], rows: [
    ["Nucleus", "Holds the cell’s DNA", "Animal and plant cells"], ["Mitochondrion", "Makes most of the cell’s ATP", "Animal and plant cells"],
    ["Ribosome", "Builds proteins from amino acids", "Every cell"], ["Chloroplast", "Turns light into sugar", "Plant cells"], ["Golgi apparatus", "Packs proteins to send out", "Animal and plant cells"]])
  static let tree = DiagramNode("The cell", [
    DiagramNode("Organelles", [DiagramNode("Nucleus"), DiagramNode("Ribosome"), DiagramNode("Golgi apparatus")]),
    DiagramNode("Energy", [DiagramNode("ATP"), DiagramNode("Glycolysis"), DiagramNode("Krebs cycle"), DiagramNode("Electron transport chain")]),
    DiagramNode("Membrane", [DiagramNode("Phospholipids"), DiagramNode("Channel proteins")])])

  private static let cellLabels = [OccBox(id: "b1", x: 0.41, y: 0.03, w: 0.12, h: 0.06, label: "Nucleus"), OccBox(id: "b2", x: 0.012, y: 0.785, w: 0.17, h: 0.06, label: "Mitochondrion"),
                                   OccBox(id: "b3", x: 0.8, y: 0.083, w: 0.17, h: 0.06, label: "Mitochondrion")]
  private static let flowLabels = [OccBox(id: "b1", x: 0.11, y: 0.12, w: 0.125, h: 0.05, label: "Acetyl-CoA"), OccBox(id: "b2", x: 0.47, y: 0.12, w: 0.07, h: 0.05, label: "Citrate"),
                                   OccBox(id: "b3", x: 0.79, y: 0.12, w: 0.1, h: 0.05, label: "Isocitrate")]
  private static func lecture(_ id: String, _ name: String, at: String, file: String, w: Int, h: Int, labels: [OccBox], figure: String) -> DiagramInfo {
    DiagramInfo(id: id, kind: "lecture", name: name, at: GuideSample.day(18), file: DiagramFile(name: file, type: "image/png", file: name + ".png", size: 0, w: w, h: h),
                src: CardSource(id: "x1", name: "Lecture 3 slides", at: at), labels: labels, figure: figure)
  }
  /// Newest first, as the list shows them (the groups are Made, From your lectures, Uploaded).
  static let all: [DiagramInfo] = [
    DiagramInfo(id: "g1", kind: "table", name: "Organelles at a glance", at: GuideSample.day(22), table: table, from: DiagramFrom(kind: "all", value: "", label: "All cards and notes"), cards: 24),
    DiagramInfo(id: "g2", kind: "mindmap", name: "The cell", at: GuideSample.day(22), tree: tree, from: DiagramFrom(kind: "tag", value: "cell", label: "cell"), cards: 12),
    lecture("g3", "Animal cell", at: "Slide 4", file: "demo-cell.png", w: 640, h: 420, labels: cellLabels, figure: "labelled figure"),
    lecture("g4", "The Krebs cycle", at: "Slide 9", file: "demo-flow.png", w: 720, h: 480, labels: flowLabels, figure: "flow diagram"),
    lecture("g5", "Enzyme reaction rates", at: "Slide 14", file: "demo-chart.png", w: 600, h: 400, labels: [], figure: "chart"),
    DiagramInfo(id: "g6", kind: "upload", name: "Whiteboard, Sep 22", at: GuideSample.day(22), file: DiagramFile(name: "demo-flow.png", type: "image/png", file: "whiteboard.png", size: 0, w: 720, h: 480), labels: nil)]

  /// The diagrams a state shows: none, only the made ones (a deck that is studied), or all six.
  static func rows(_ state: String) -> [DiagramInfo] {
    state == "Diagrams (none yet)" ? [] : readOnly(state) ? all.filter(\.isMade) : all
  }

  /// A sample picture (a drawing bundled with the app): the file a sample diagram names.
  static func picture(_ name: String) -> UIImage? {
    guard name.hasPrefix("demo-"), let url = Bundle.main.url(forResource: (name as NSString).deletingPathExtension, withExtension: (name as NSString).pathExtension) else { return nil }
    return UIImage(contentsOfFile: url.path)
  }

  /// What a state opens on the deck page (the canvas's `view`): a diagram open, maybe being renamed or asked to be deleted, the Make diagram sheet, an upload on its way or not working.
  @MainActor static func open(_ state: String, deckId: String, flow: DiagramsFlow, nav: Nav) {
    flow.resetViewer(); flow.openSheet()
    flow.uploading = nil; flow.upError = ""
    switch state {
    case "A picture open": flow.boxes = true; nav.sheet = .diagram(deckId: deckId, id: "g3")
    case "An uploaded picture open": nav.sheet = .diagram(deckId: deckId, id: "g6")
    case "A table open": nav.sheet = .diagram(deckId: deckId, id: "g1")
    case "A mind map open": nav.sheet = .diagram(deckId: deckId, id: "g2")
    case "Renaming a diagram": flow.renaming = true; flow.draft = "Animal cell"; nav.sheet = .diagram(deckId: deckId, id: "g3")
    case "Delete asked": flow.confirm = true; nav.sheet = .diagram(deckId: deckId, id: "g3")
    case "Uploading a picture": flow.uploading = "IMG_2058.jpg"; flow.upDeck = deckId
    case "Upload didn’t work": flow.upError = "That file is over 20 MB. Go Pro for up to 40 MB."; flow.upDeck = deckId
    case "Make diagram": nav.sheet = .makeDiagram(deckId)
    case "Making a diagram": flow.making = true; nav.sheet = .makeDiagram(deckId)
    case "Make diagram (it didn’t work)":
      flow.makeError = MakeErr(message: "That’s today’s 3 free diagrams. Go Pro for 30 a day.", pro: true, code: "day", again: false); nav.sheet = .makeDiagram(deckId)
    default: break
    }
  }
}
