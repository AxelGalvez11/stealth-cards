// The iPhone app's school search (Data/Schools.swift) for a list of queries: swift run as  schools <schools.json> <queries.json> <out.json>.
import Foundation
let a = CommandLine.arguments
let list = SchoolList(file: URL(fileURLWithPath: a[1]))
let queries = (try! JSONSerialization.jsonObject(with: Data(contentsOf: URL(fileURLWithPath: a[2])))) as! [String]
let out = queries.map { q in list.find(q, limit: 30).map(\.id) }
try! JSONSerialization.data(withJSONObject: out).write(to: URL(fileURLWithPath: a[3]))
print("\(list.rows.count) schools, \(queries.count) queries")
