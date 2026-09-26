import Foundation

@main
struct MCPInAppSearchTests {
  static func main() throws {
    for term in ["Terminator", "cursos", "Carlos", "fotografía", "C++ & Swift? #1", "", "  dos palabras  ", "búscame los cursos"] {
      let url = try MCPInAppSearch.url(term: term)
      let components = URLComponents(url: url, resolvingAgainstBaseURL: false)!
      precondition(components.scheme == "vidkar" && components.host == "search" && components.path.isEmpty)
      precondition(components.queryItems == [URLQueryItem(name: "q", value: term.trimmingCharacters(in: .whitespacesAndNewlines)), URLQueryItem(name: "entity", value: "all")])
      precondition(components.user == nil && components.password == nil && components.fragment == nil)
      precondition(!url.absoluteString.contains("+"))
    }
    _ = try MCPInAppSearch.url(term: String(repeating: "a", count: 120))
    for term in [String(repeating: "a", count: 121), String(repeating: "😀", count: 61), "a\u{0}b", "a\nb"] {
      do {
        _ = try MCPInAppSearch.url(term: term)
        preconditionFailure("Debe rechazar criterios inválidos")
      } catch MCPInAppSearch.InvalidCriteria.invalidTerm { }
    }
    print("Criterios literales, límites UTF-16 y enlace sin tool/consentimiento/playback: OK")
  }
}