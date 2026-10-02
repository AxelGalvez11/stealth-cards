// The iPhone app's card reader (Data/ReadCards.swift) on the texts import-js.mjs made, giving what the web gives: [[deck name, cards], ...]
// for each text. `decode` instead reads made-up files in every way a text file can come (Data/ReadCards.swift `text(_:)`) and prints a line
// for each that comes out wrong.
//   import <cases.json> <out.json>
//   import decode
import Foundation

let a = CommandLine.arguments
if a.count > 1 && a[1] == "decode" {
  // The words every file below holds, and how each one is written.
  let words = "café\tcoffee\n“smart”,quotes\nnaïve – ok"
  func utf16(_ s: String, big: Bool, mark: Bool) -> Data {
    var d = Data(mark ? (big ? [0xFE, 0xFF] : [0xFF, 0xFE]) : [])
    for u in s.utf16 { d.append(contentsOf: big ? [UInt8(u >> 8), UInt8(u & 0xFF)] : [UInt8(u & 0xFF), UInt8(u >> 8)]) }
    return d
  }
  let latin = "café\tcoffee\nnaïve,ok"
  let files: [(String, Data, String?)] = [
    ("UTF-8", Data(words.utf8), words),
    ("UTF-8 with a BOM", Data([0xEF, 0xBB, 0xBF]) + Data(words.utf8), words),
    ("UTF-16, little end first, with a BOM", utf16(words, big: false, mark: true), words),
    ("UTF-16, big end first, with a BOM", utf16(words, big: true, mark: true), words),
    ("UTF-16, little end first, no BOM", utf16(words, big: false, mark: false), words),
    ("UTF-16, big end first, no BOM", utf16(words, big: true, mark: false), words),
    ("Latin-1", latin.data(using: .isoLatin1)!, latin),
    ("Latin-1, an even number of bytes", (latin + "!").data(using: .isoLatin1)!, latin + "!"),
    ("Windows-1252 (Excel's quotes and dashes)", "“smart”,quotes – ok €".data(using: .windowsCP1252)!, "“smart”,quotes – ok €"),
    ("Windows-1252's unused bytes", Data([0x61, 0x81, 0x2C, 0x62, 0x8D]), "a\u{81},b\u{8D}"),
    ("an empty file", Data(), ""),
    ("plain ASCII", Data("a,b\nc,d".utf8), "a,b\nc,d"),
    ("a picture (not text)", Data([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A, 0x00, 0x00, 0x00, 0x0D, 0x49, 0x48, 0x44, 0x52, 0x00, 0x00, 0x01, 0x00]), nil),
  ]
  var bad = 0
  for (name, data, want) in files {
    let got = ReadCards.text(data)
    if got != want { bad += 1; print("decode differs: \(name): \(String(reflecting: got)) instead of \(String(reflecting: want))") }
  }
  print("Text files: \(files.count) ways of writing them, \(bad) differ from what they hold")
  exit(bad == 0 ? 0 : 1)
}

let cases = try! JSONSerialization.jsonObject(with: Data(contentsOf: URL(fileURLWithPath: a[1]))) as! [[String: Any]]
let out: [Any] = cases.map { c in ReadCards.read(c["text"] as! String, name: c["deck"] as! String).map { [$0.name, $0.cards.map(\.json)] as [Any] } }
try! JSONSerialization.data(withJSONObject: out).write(to: URL(fileURLWithPath: a[2]))
