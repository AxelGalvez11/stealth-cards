// Stands in for the app's gradient type, which Engine.swift's DeckInfo refers to (the checks don't draw anything).
struct Mesh { static func deck(seed: String, round: Int = 0, style: String? = nil) -> Mesh { Mesh() } }
// Stands in for a class in your library (Data/ClassData.swift), which the library's models hold (the checks don't use it).
struct LibClass: Decodable {}
