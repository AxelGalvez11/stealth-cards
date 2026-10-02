// The canvas's sample for the Make cards boards (design/materials.mjs MATERIALS_MOCK `MK`): what each of the board's steps shows. A design
// screen opens `-board PhoneMake -state Review` (or any name below, the canvas's own `step` setting); nothing is sent anywhere.
import Foundation

enum MakeSample {
  /// The names the board's step setting offers (MAKE_STEPS).
  static let steps = ["Pick", "Upload", "Upload (a file added)", "Photos", "Camera", "Record", "Recording", "Paused", "Paste", "Paste (a language set)", "Paste (language list)", "YouTube", "YouTube transcript", "Topic", "More from a source",
                      "Making", "Making a recording", "Review", "Review (notes open)", "Review (notes off)", "Review (no room for notes)", "Review (audio cards)", "Review (editing a card)", "Limit reached", "File too big", "Error"]

  /// A step by its name (case doesn't matter), or Pick.
  static func name(_ s: String?) -> String { steps.first { $0.lowercased() == (s ?? "").lowercased() } ?? "Pick" }

  private static let none = URL(fileURLWithPath: "/dev/null")
  private static func file(_ name: String, _ bytes: Int, _ fam: MakeFile.Family, _ type: String) -> MakeFile { MakeFile(name: name, type: type, size: bytes, fam: fam, url: none) }
  /// The sample's slides: "Lecture 3 slides.pdf", 4.2 MB.
  private static var slides: MakeFile { file("Lecture 3 slides.pdf", 4_200_000, .doc, "application/pdf") }

  /// The recorder's meter (60 readings).
  static let levels: [Double] = (0..<60).map { i in
    let x = Double(i)
    return ((0.18 + 0.5 * abs(sin(x * 0.55)) * (0.6 + 0.4 * sin(x * 0.17))) * 100).rounded() / 100
  }
  private static let cards: [MakeCard] = [
    MakeCard(key: "k1", kind: "basic", front: "What does the electron transport chain pump across the inner membrane?", back: "Protons (H⁺), from the matrix into the intermembrane space.", text: "", at: "p. 4"),
    MakeCard(key: "k2", kind: "cloze", front: "", back: "", text: "The [[mitochondrion]] is the powerhouse of the cell.", at: "p. 4"),
    MakeCard(key: "k3", kind: "basic", front: "What does ATP synthase make?", back: "ATP, using the proton gradient.", text: "", at: "p. 5"),
    MakeCard(key: "k4", kind: "basic", front: "Where does glycolysis happen?", back: "In the cytoplasm.", text: "", at: "p. 7", gone: true),
    MakeCard(key: "k5", kind: "cloze", front: "", back: "", text: "The Krebs cycle runs in the [[mitochondrial matrix]].", at: "p. 8"),
    MakeCard(key: "k6", kind: "basic", front: "What carries electrons to the transport chain?", back: "NADH and FADH₂.", text: "", at: "p. 9")]
  /// The starter notes drafted from the slides (the canvas's `notes`), and the same kind of draft for the Spanish words.
  private static let notes: MakeNotes = {
    let sections = [MakeNote(heading: "The mitochondrion", at: "p. 4", text: "The **mitochondrion** makes most of the cell’s **ATP**. It has two membranes and is the site of the electron transport chain."),
                    MakeNote(heading: "The electron transport chain", at: "p. 5", text: "- **NADH** and **FADH₂** pass electrons along the chain\n- Protons (H⁺) are pumped into the intermembrane space\n- **ATP synthase** lets them flow back and makes ATP"),
                    MakeNote(heading: "Glycolysis", at: "p. 7", text: "Happens in the **cytoplasm** and splits one glucose into two **pyruvate**."),
                    MakeNote(heading: "The Krebs cycle", at: "p. 8", text: "| Where | What it makes |\n| --- | --- |\n| **Matrix** | NADH, FADH₂ and a little ATP |")]
    let overview = "How cells make energy: the mitochondrion, the electron transport chain and the Krebs cycle. It ends with how ATP is made and what runs out without oxygen."
    let text = (["# Lecture 3 slides", "", overview, ""] + sections.flatMap { ["## \($0.heading) (\($0.at))", "", $0.text, ""] }).joined(separator: "\n")
    return MakeNotes(title: "Lecture 3 slides", overview: overview, sections: sections, text: text)
  }()
  private static let spanishNotes = MakeNotes(title: "Spanish words", overview: notes.overview, sections: notes.sections.prefix(2).map { MakeNote(heading: $0.heading, at: "", text: $0.text) },
    text: "# Spanish words\n\nGreetings and words for the home and school.\n\n## Greetings\n\n**buenos días** means good morning. Use **usted** to be polite.\n\n## The home\n\n**la casa** is the house.\n")
  private static let spanish: [MakeCard] = [
    MakeCard(key: "k1", kind: "audio", front: "", back: "the house", text: "", at: "", speak: "la casa", lang: "es"),
    MakeCard(key: "k2", kind: "audio", front: "", back: "Good morning", text: "", at: "", speak: "buenos días", lang: "es"),
    MakeCard(key: "k3", kind: "basic", front: "When do you use “usted”?", back: "To be formal or polite with someone, like a teacher or a stranger.", text: "", at: ""),
    MakeCard(key: "k4", kind: "audio", front: "", back: "Where is the library?", text: "", at: "", speak: "¿Dónde está la biblioteca?", lang: "es"),
    MakeCard(key: "k5", kind: "cloze", front: "", back: "", text: "Ella [[tiene]] dos hermanos.", at: "")]
  private static let video = "https://www.youtube.com/watch?v=dQw4w9WgXcQ"

  /// What a step shows: the flow's memory, the plan's limits, and the recorder (its state, the time, and the meter).
  @MainActor static func apply(_ name: String, to flow: MakeFlow) {
    var m = MakeState(), info = MakeInfo.pro
    m.step = "add"
    var rec: (MakeRecorder.State, Double)?
    switch name {
    case "Pick": m.step = "pick"
    case "Upload": m.kind = "file"
    case "Upload (a file added)": m.kind = "file"; m.files = [slides]
    // (Camera is Photos with Lucida's own camera screen open over it: MakeScreen opens it.)
    case "Photos", "Camera":
      m.kind = "photo"
      m.files = ["IMG_2041.jpg", "IMG_2042.jpg", "IMG_2043.jpg"].enumerated().map { i, n in file(n, 1_100_000 + i * 300_000, .image, "image/jpeg") }
    case "Record": m.kind = "record"
    case "Recording": m.kind = "record"; rec = (.recording, 754)
    case "Paused": m.kind = "record"; rec = (.paused, 754)
    case "Paste":
      m.kind = "paste"
      m.text = "The mitochondrion is the powerhouse of the cell. It makes most of the cell’s ATP through the electron transport chain, which pumps protons across the inner membrane.\n\nThe nucleus holds the cell’s DNA, and the ribosomes translate mRNA into protein."
    // (Paste (language list) is the same with the language list open: MakeScreen opens it.)
    case "Paste (a language set)", "Paste (language list)":
      m.kind = "paste"
      m.text = "la casa · the house\nbuenos días · good morning\n¿Dónde está la biblioteca? · Where is the library?\nElla tiene dos hermanos · She has two siblings"
      m.opts.audio = true; m.opts.lang = "es"
    case "YouTube": m.kind = "video"; m.url = video
    case "YouTube transcript":
      m.kind = "video"; m.transcript = true; m.url = video
      m.text = "0:00\nWelcome to the lecture on enzymes\n0:20\nAn enzyme lowers the activation energy of a reaction"
    case "Topic": m.kind = "topic"; m.topic = "The Krebs cycle"
    case "More from a source": m.kind = "file"; m.from = MakeFrom(deckId: "cell", id: "x1", name: "Lecture 3 slides", kind: "file")
    case "Making": m.step = "making"; m.kind = "file"; m.progress = MakeProgress(word: "Writing cards…", phase: "write", i: 3, n: 8)
    case "Making a recording": m.step = "making"; m.kind = "record"; m.progress = MakeProgress(word: "Listening to your recording…", phase: "read", i: 1, n: 2)
    case "Review": m.step = "review"; m.kind = "file"; m.cards = cards; m.name = "Lecture 3 slides"; m.notes = notes
    case "Review (notes open)": m.step = "review"; m.kind = "file"; m.cards = cards; m.name = "Lecture 3 slides"; m.notes = notes; m.notesOpen = true
    case "Review (notes off)": m.step = "review"; m.kind = "file"; m.cards = cards; m.name = "Lecture 3 slides"; m.notes = notes; m.keepNotes = false
    case "Review (no room for notes)": m.step = "review"; m.kind = "file"; m.cards = cards; m.name = "Lecture 3 slides"; m.notes = notes; m.guideFull = true
    case "Review (audio cards)": m.step = "review"; m.kind = "paste"; m.cards = spanish; m.name = "Spanish words"; m.notes = spanishNotes
    case "Review (editing a card)": m.step = "review"; m.kind = "file"; m.cards = cards; m.name = "Lecture 3 slides"; m.notes = notes; m.editing = "k2"
    case "Limit reached":
      m.step = "error"; m.kind = "file"; info = .free
      m.error = MakeErr(message: "That’s today’s 3 free makes. Go Pro for 30 a day.", pro: true, code: "day")
    case "File too big":
      m.kind = "file"; info = .free; m.files = [slides]
      m.error = MakeErr(message: "That file is over 20 MB. Go Pro for up to 40 MB.", soft: true)
    case "Error": m.step = "error"; m.kind = "file"; m.error = MakeErr(message: "The AI didn’t answer. Try again in a moment.", again: true)
    default: m.step = "pick"
    }
    flow.env.info = { info }
    flow.m = m
    flow.recorder.show(rec?.0 ?? .idle, secs: rec?.1 ?? 0, levels: rec == nil ? [] : levels)
  }
}
