// The school list (web/schools.json, made by design/schools.mjs from the US Department of Education's IPEDS directory and bundled with
// the app): about 4,000 colleges and universities, searched as you type with the same rules as the web app's pickers (web/school.js
// schoolSearch). Nothing here needs the rest of the app, so the parity check compiles this file alone.
import Foundation

/// A college or university from the list: its IPEDS id, name, city, state, and the other names people search it by (UCLA, MIT).
struct School: Hashable {
  var id = "", name = "", city = "", state = "", others = ""
  /// "Stanford, CA": the line under its name in a picker.
  var place: String { city + ", " + state }
}

final class SchoolList {
  static let shared = SchoolList()
  let rows: [School]
  /// What a row's words are, worked out once: its name's, the rest's (city, state, other names), the other names', the whole name,
  /// and each other name as one phrase (the web's tokensOf).
  private struct Words { var name: [String], more: [String], alias: [String], flat: String, names: [String] }
  private let words: [Words]

  /// The list in the app's bundle, or (for a check) from a file.
  init(file: URL? = nil) {
    var out: [School] = []
    if let url = file ?? Bundle.main.url(forResource: "schools", withExtension: "json"),
       let data = try? Data(contentsOf: url),
       let json = (try? JSONSerialization.jsonObject(with: data)) as? [String: Any],
       let list = json["rows"] as? [[String]] {
      for r in list where r.count >= 4 { out.append(School(id: r[0], name: r[1], city: r[2], state: r[3], others: r.count > 4 ? r[4] : "")) }
    }
    rows = out
    words = out.map { s in
      Words(name: SchoolList.split(s.name), more: SchoolList.split(s.city + " " + s.state + " " + s.others), alias: SchoolList.split(s.others),
            flat: SchoolList.split(s.name).joined(separator: " "),
            names: s.others.split(whereSeparator: { $0 == "|" || $0 == "," }).map { SchoolList.split(String($0)).joined(separator: " ") }.filter { !$0.isEmpty })
    }
  }

  /// A school by its id.
  func school(_ id: String) -> School? { rows.first { $0.id == id } }

  /// Typed words as the words to match: lower case, no accents, "&" as "and", split at anything that isn't a letter or number.
  static func split(_ s: String) -> [String] {
    let folded = String(String.UnicodeScalarView(s.lowercased().decomposedStringWithCanonicalMapping.unicodeScalars.filter { !(0x300...0x36F).contains($0.value) }))
    return folded.replacingOccurrences(of: "&", with: " and ").split(whereSeparator: { c in !(c.isASCII && (c.isLetter || c.isNumber)) }).map(String.init)
  }

  /// The schools some typed words find, best first: every word starts a word of the school's name, its other names, its city, or its
  /// state ("tex aus" finds The University of Texas at Austin; "ucla" finds UCLA by its other name). A school whose name is what was
  /// typed comes first, then one whose other name is (mit), then names that start with it, names that hold all the words, other
  /// names, and places. At most `limit`.
  func find(_ q: String, limit: Int = 30) -> [School] {
    let w = SchoolList.split(q)
    guard !w.isEmpty else { return [] }
    let flat = w.joined(separator: " ")
    var hits: [(i: Int, rank: Int)] = []
    for (i, t) in words.enumerated() {
      let inName = w.allSatisfy { x in t.name.contains { $0.hasPrefix(x) } }
      let inAny = inName || w.allSatisfy { x in t.name.contains { $0.hasPrefix(x) } || t.more.contains { $0.hasPrefix(x) } }
      guard inAny else { continue }
      let rank = t.flat == flat ? 0 : t.names.contains(flat) ? 1 : t.flat.hasPrefix(flat) ? 2 : inName ? 3 : w.allSatisfy({ x in t.alias.contains { $0.hasPrefix(x) } }) ? 4 : 5
      hits.append((i, rank))
    }
    // Shorter names first within a rank, then by the letters (as the web compares them: by UTF-16 units).
    hits.sort { a, b in
      if a.rank != b.rank { return a.rank < b.rank }
      let x = rows[a.i].name, y = rows[b.i].name
      if x.utf16.count != y.utf16.count { return x.utf16.count < y.utf16.count }
      return x.utf16.lexicographicallyPrecedes(y.utf16)
    }
    return hits.prefix(limit).map { rows[$0.i] }
  }
}
