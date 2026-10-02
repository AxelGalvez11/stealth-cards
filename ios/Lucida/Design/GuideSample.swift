// The canvas's sample for the Guide and Sources boards (design/materials.mjs MATERIALS_MOCK, its `GD` and `GMODE`): the sample deck's Guide, its two extra
// pages, its five Sources of different kinds, what the recording said, and its older versions. A design screen asks for these where a real one asks
// the library (`Store.guide`, `Store.sources`), and `-state` (or `-guide`) picks which of the canvas's six settings the deck page shows.
import Foundation

enum GuideSample {
  /// The deck page's `guide` setting (the canvas's GUIDE_STATES): what the Guide and the Sources hold.
  static let states = ["Guide and sources", "Guide pages", "Long guide", "A source open", "No guide yet", "Studying (read only)"]
  /// The PhoneGuide board's `view`.
  static let views = ["Write", "Preview", "Older versions", "A new page", "Nothing written yet"]
  static let deckId = "cell"

  static let text = [
    "# Cell Biology: Exam 1", "", "Everything for the first exam, in the order we covered it. Start with the checklist, then the mnemonics.", "", "## Checklist",
    "- [x] Organelles and what each one does", "- [x] The electron transport chain", "- [ ] Glycolysis, step by step", "- [ ] Mitosis versus meiosis", "", "## Mnemonics",
    "| Phase | Remember it as |", "| --- | --- |", "| Prophase | **P**ut your chromosomes in **P**lace |", "| Metaphase | **M**iddle of the cell |",
    "| Anaphase | **A**part they go |", "| Telophase | **T**wo new cells |", "", "> The mitochondrion makes most of the cell’s ATP.", "",
    "Questions? Ask in [office hours](https://example.edu/office-hours)."].joined(separator: "\n")
  /// The Long guide state: the same Guide twice over.
  static var longText: String { text + "\n\n" + text.replacingOccurrences(of: "# Cell Biology: Exam 1", with: "## More for the exam") }
  static let pages = [
    MakeGuidePage(id: "g1", title: "Lecture 3 summary", text: "## Lecture 3\n\nThe **electron transport chain** pumps protons across the inner membrane.\n\n1. NADH gives up its electrons.\n2. Protons are pumped out of the matrix.\n3. ATP synthase lets them flow back and makes ATP."),
    MakeGuidePage(id: "g2", title: "Mnemonics", text: "- **PMAT** for the phases of mitosis\n- *Please Do Not Throw Sausage Pizza Away* for the layers")]

  /// A day of September 2026 at ten in the morning, in this phone's time (the canvas's day(8, d)).
  static func day(_ d: Int) -> Double {
    var c = DateComponents(); c.year = 2026; c.month = 9; c.day = d; c.hour = 10
    return (Calendar.current.date(from: c)?.timeIntervalSince1970 ?? 0) * 1000
  }
  static let sources: [MakeSourceInfo] = [
    MakeSourceInfo(id: "x1", kind: "file", name: "Lecture 3 slides", cards: 24, pages: 32, at: day(18),
                   files: [SourceFile(name: "sx1-0.pdf", type: "application/pdf", file: "Lecture 3 slides.pdf", size: 4_200_000)]),
    MakeSourceInfo(id: "x2", kind: "recording", name: "Lecture 4 · Sep 21", cards: 18, at: day(21), seconds: 2532, textName: "sx2-text.txt",
                   files: [SourceFile(name: "sx2-0.m4a", type: "audio/mp4", file: "Lecture 4.m4a", size: 6_100_000)]),
    MakeSourceInfo(id: "x3", kind: "video", name: "Mitochondria explained", cards: 9, at: day(20), url: "https://www.youtube.com/watch?v=dQw4w9WgXcQ", textName: "sx3-text.txt"),
    MakeSourceInfo(id: "x4", kind: "photo", name: "Whiteboard, Sep 22", cards: 6, at: day(22),
                   files: [SourceFile(name: "sx4-0.jpg", type: "image/jpeg", file: "IMG_2041.jpg", size: 1_100_000), SourceFile(name: "sx4-1.jpg", type: "image/jpeg", file: "IMG_2042.jpg", size: 1_400_000)]),
    MakeSourceInfo(id: "x5", kind: "topic", name: "The Krebs cycle", cards: 12, at: day(19), text: "The Krebs cycle")]
  /// What the recording and the video said, with the time of each part.
  static let talk = "<<0:00>>\nWelcome back. Today we finish the electron transport chain and see how it makes ATP.\n\n<<1:00>>\nThe chain pumps protons across the inner membrane, and ATP synthase lets them flow back.\n\n<<2:00>>\nWithout oxygen as the last acceptor, the chain backs up and ATP production stops."
  static func sourceText(_ name: String) -> String { name.hasPrefix("sx2") || name.hasPrefix("sx3") ? talk : "" }

  /// The older versions the History shows (newest first).
  static var versions: [GuideVersion] {
    [GuideVersion(at: day(21), saved: 0, text: text.replacingOccurrences(of: "- [x] The electron transport chain", with: "- [ ] The electron transport chain")),
     GuideVersion(at: day(18), saved: 0, text: "# Cell Biology: Exam 1\n\nEverything for the first exam.")]
  }

  /// The Guide a state shows (the canvas's guide()): its words and pages, and whether it can be changed (not when it's only studied).
  static func guide(_ state: String) -> GuideVM {
    let ro = readOnly(state)
    return GuideVM(deckId: deckId, text: state == "No guide yet" ? "" : state == "Long guide" ? longText : text, at: 0, pages: state == "Guide pages" ? pages : [], can: !ro, studying: ro)
  }
  /// A deck that is only studied (the canvas's Studying (read only), and Diagrams (studying)): nothing of it can be changed, and it has no Sources.
  static func readOnly(_ state: String) -> Bool { state == "Studying (read only)" || DiagramSample.readOnly(state) }
  static func sources(_ state: String) -> [MakeSourceInfo] { state == "No guide yet" || readOnly(state) ? [] : sources }

  /// What the shared deck's page shows (the canvas's publicGuide()): the pages anyone can read, and how many sources it was made from.
  static func publicGuide(_ state: String) -> PublicGuide {
    state == "No guide yet" ? PublicGuide(pages: [], sources: 0)
      : PublicGuide(pages: [PublicGuide.Page(id: "main", title: "Guide", text: text)] + (state == "Guide pages" ? pages.map { PublicGuide.Page(id: $0.id, title: $0.title, text: $0.text) } : []), sources: 5,
                    diagrams: DiagramSample.all.filter(\.isMade))
  }
}
