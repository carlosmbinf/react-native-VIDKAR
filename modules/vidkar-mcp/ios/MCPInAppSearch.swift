import Foundation

// Contrato de navegación, no parser de lenguaje natural ni catálogo de herramientas.
enum MCPInAppSearch {
  enum InvalidCriteria: LocalizedError {
    case invalidTerm
    var errorDescription: String? {
      "Indica una búsqueda de hasta 120 caracteres, sin caracteres de control."
    }
  }

  static func url(term: String) throws -> URL {
    let query = term.trimmingCharacters(in: .whitespacesAndNewlines)
    guard query.utf16.count <= 120,
          !query.unicodeScalars.contains(where: { CharacterSet.controlCharacters.contains($0) }) else {
      throw InvalidCriteria.invalidTerm
    }
    var components = URLComponents()
    components.scheme = "vidkar"
    components.host = "search"
    components.queryItems = [URLQueryItem(name: "q", value: query), URLQueryItem(name: "entity", value: "all")]
    // URLSearchParams de JS interpreta '+' como espacio: preservarlo literalmente.
    components.percentEncodedQuery = components.percentEncodedQuery?.replacingOccurrences(of: "+", with: "%2B")
    guard let url = components.url else { throw InvalidCriteria.invalidTerm }
    return url
  }
}